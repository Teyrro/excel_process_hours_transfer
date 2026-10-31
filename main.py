import traceback

from excel_process import run


def wait_key():
    print("Ожидания нажатия клавиши...")
    try:
        from msvcrt import getch

        getch()
    except ImportError:
        input()
    print("Клавиша нажата!")


if __name__ == "__main__":
    try:
        run()
    except PermissionError as e:
        print(e)
        print(
            "Если говорить по-русски, закройте файлы указанные выше, чтобы сеанс был освобождён"
        )
        wait_key()
    except Exception as e:
        print(e)
        with open("Ошибка при запуске.txt", "w", encoding="utf-8") as f:
            f.write(traceback.format_exc())
        wait_key()
