import sys
import traceback

from excel_process import run
from ui import serve


def wait_key():
    print("Ожидания нажатия клавиши...")
    try:
        from msvcrt import getch

        getch()
    except ImportError:
        input()
    print("Клавиша нажата!")


def report(text: str):
    # В собранном приложении консоли нет — показываем сообщение окном Windows
    if sys.stdin is None and sys.platform == "win32":
        import ctypes

        ctypes.windll.user32.MessageBoxW(None, text, "Перенос часов", 0x10)
        return
    print(text)
    wait_key()


if __name__ == "__main__":
    try:
        # По умолчанию — окно приложения, «--console» — старый режим по файлам папки
        if "--console" in sys.argv:
            run()
        else:
            serve()
    except PermissionError as e:
        report(
            f"{e}\nЕсли говорить по-русски, закройте файлы указанные выше, чтобы сеанс был освобождён"
        )
    except Exception as e:
        with open("Ошибка при запуске.txt", "w", encoding="utf-8") as f:
            f.write(traceback.format_exc())
        report(f"{e}\nПодробности записаны в файл «Ошибка при запуске.txt»")
