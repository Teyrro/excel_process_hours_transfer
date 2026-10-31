"""Интерфейс приложения: страница из web/ в собственном окне (pywebview).

Внутри работает небольшой HTTP-сервер на 127.0.0.1 со случайным свободным портом;
сервер живёт ровно столько, сколько открыто окно. Загруженные файлы складываются
во временную папку сеанса, исходники не трогаются.
"""

import contextlib
import io
import json
import os
import platform
import re
import shutil
import sys
import tempfile
import threading
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, unquote, urlparse

from excel_process import run

HOST = "127.0.0.1"
ROLES = ("outfit", "plan", "dest")
MAX_UPLOAD = 200 * 1024 * 1024
SESSION_RE = re.compile(r"[a-z0-9]{8,32}")

# В сборке PyInstaller файлы страницы лежат во временной папке распаковки
base_dir = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
static_dir = os.path.join(base_dir, "web")
work_root = tempfile.mkdtemp(prefix="hours_transfer_")
run_lock = threading.Lock()

STATIC_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
}


def messages_path() -> str:
    # Свои фразы можно положить рядом с программой, иначе берутся встроенные
    custom = os.path.join(os.getcwd(), "messages.json")
    return (
        custom if os.path.isfile(custom) else os.path.join(static_dir, "messages.json")
    )


def session_dir(session: str, role: str) -> str:
    return os.path.join(work_root, session, role)


def list_files(directory: str) -> list[str]:
    if not os.path.isdir(directory):
        return []
    return sorted(os.path.join(directory, f) for f in os.listdir(directory))


def process(session: str) -> dict:
    outfits = list_files(session_dir(session, "outfit"))
    plan = list_files(session_dir(session, "plan"))
    dest = list_files(session_dir(session, "dest"))
    if not outfits or len(plan) != 1 or len(dest) != 1:
        return {
            "ok": False,
            "log": "Нужны наряды, один план производства и одна расшифровка ЗП",
        }

    log = io.StringIO()
    with run_lock, contextlib.redirect_stdout(log):
        try:
            run(outfits, plan[0], dest[0])
            ok = True
        except PermissionError as e:
            print(e)
            print("Закройте файлы, указанные выше, и попробуйте ещё раз")
            ok = False
        except Exception as e:
            print(e)
            traceback.print_exc(file=log)
            ok = False
    # Временные пути пользователю ни к чему — оставляем только имена файлов
    text = log.getvalue()
    for role in ROLES:
        text = text.replace(session_dir(session, role) + os.sep, "")
    return {
        "ok": ok,
        "log": text,
        "file": os.path.basename(dest[0]) if ok else None,
    }


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def send_json(self, data: dict, status: int = 200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_file(self, path: str, content_type: str, download_name: str | None = None):
        with open(path, "rb") as f:
            body = f.read()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        if download_name:
            self.send_header(
                "Content-Disposition",
                f"attachment; filename*=UTF-8''{quote(download_name)}",
            )
        self.end_headers()
        self.wfile.write(body)

    def params(self) -> dict[str, str]:
        return {k: v[0] for k, v in parse_qs(urlparse(self.path).query).items()}

    def valid_session(self, params: dict) -> str | None:
        session = params.get("session", "")
        if not SESSION_RE.fullmatch(session):
            self.send_json({"ok": False, "log": "Некорректный сеанс"}, 400)
            return None
        return session

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/":
            path = "/index.html"
        if path == "/messages.json":
            return self.send_file(messages_path(), STATIC_TYPES[".json"])
        if path == "/api/download":
            params = self.params()
            session = self.valid_session(params)
            if session is None:
                return
            dest = list_files(session_dir(session, "dest"))
            if len(dest) != 1:
                return self.send_json({"ok": False, "log": "Файл не найден"}, 404)
            return self.send_file(
                dest[0], "application/octet-stream", os.path.basename(dest[0])
            )

        name = os.path.basename(unquote(path))
        file = os.path.join(static_dir, name)
        ext = os.path.splitext(name)[1]
        if ext not in STATIC_TYPES or not os.path.isfile(file):
            self.send_error(404)
            return
        self.send_file(file, STATIC_TYPES[ext])

    def do_POST(self):
        path = urlparse(self.path).path
        params = self.params()
        session = self.valid_session(params)
        if session is None:
            return

        if path == "/api/upload":
            role = params.get("role")
            # Имя важно: по нему в нарядах определяется месяц
            name = os.path.basename(params.get("name", ""))
            length = int(self.headers.get("Content-Length", 0))
            if role not in ROLES or not name.lower().endswith((".xlsx", ".xls")):
                return self.send_json({"ok": False, "log": "Нужен файл Excel"}, 400)
            if length > MAX_UPLOAD:
                return self.send_json({"ok": False, "log": "Файл слишком большой"}, 413)
            directory = session_dir(session, role)
            # План и ЗП — по одному файлу, новый заменяет старый
            if role != "outfit":
                shutil.rmtree(directory, ignore_errors=True)
            os.makedirs(directory, exist_ok=True)
            with open(os.path.join(directory, name), "wb") as f:
                f.write(self.rfile.read(length))
            return self.send_json({"ok": True})

        if path == "/api/remove":
            role = params.get("role")
            name = os.path.basename(params.get("name", ""))
            if role in ROLES and name:
                with contextlib.suppress(FileNotFoundError):
                    os.remove(os.path.join(session_dir(session, role), name))
            return self.send_json({"ok": True})

        if path == "/api/run":
            return self.send_json(process(session))

        self.send_error(404)


class Api:
    """Методы, доступные странице в окне как pywebview.api.*"""

    def save(self, session: str) -> dict:
        import webview

        if not SESSION_RE.fullmatch(session or ""):
            return {"ok": False}
        dest = list_files(session_dir(session, "dest"))
        if len(dest) != 1:
            return {"ok": False}
        name = os.path.basename(dest[0])
        chosen = webview.windows[0].create_file_dialog(
            webview.FileDialog.SAVE,
            save_filename=name,
            file_types=("Excel (*.xlsx;*.xls)",),
        )
        if not chosen:
            return {"ok": False, "cancelled": True}
        # В зависимости от платформы приходит строка или кортеж путей
        target = chosen if isinstance(chosen, str) else chosen[0]
        shutil.copyfile(dest[0], target)
        return {"ok": True, "name": os.path.basename(target)}


def start_server() -> tuple[ThreadingHTTPServer, str]:
    # Порт 0 — система сама выдаст свободный, конфликтов с другими копиями нет
    server = ThreadingHTTPServer((HOST, 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, f"http://{HOST}:{server.server_address[1]}/"


def serve():
    import webview

    server, url = start_server()
    try:
        webview.create_window(
            "Перенос часов",
            url,
            js_api=Api(),
            width=1280,
            height=820,
            min_size=(420, 600),
        )
        # Тихая фоновая музыка — часть интерфейса, разрешаем звук без отдельного жеста
        chromium_flags = ["--autoplay-policy=no-user-gesture-required"]
        gui = None
        if sys.platform.startswith("linux"):
            # Сразу Qt: иначе pywebview сначала пробует GTK и пишет в консоль ошибку
            gui = "qt"
            if "microsoft" in platform.release().lower():
                # В WSL нет аппаратной графики — рисуем программно, без ошибок MESA и GPU
                os.environ.setdefault("LIBGL_ALWAYS_SOFTWARE", "1")
                chromium_flags += ["--disable-gpu", "--log-level=3"]
        os.environ.setdefault("QTWEBENGINE_CHROMIUM_FLAGS", " ".join(chromium_flags))
        os.environ.setdefault("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", chromium_flags[0])
        # Возвращается, когда пользователь закрывает окно — вместе с ним гасим сервер
        webview.start(gui=gui)
    finally:
        server.shutdown()
        server.server_close()
        shutil.rmtree(work_root, ignore_errors=True)
