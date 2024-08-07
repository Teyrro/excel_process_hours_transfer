import os
from msvcrt import getch

from fastexcel import _fastexcel

from excel_process import ExcelProcess, curr_dir, info_dir

if __name__ == '__main__':
    if not os.path.isdir(curr_dir + info_dir):
        os.makedirs(curr_dir + info_dir)
    try:
        ExcelProcess()
    except _fastexcel.CalamineError as e:
        print(e)
        print("Если говорить по-русски, закройте файлы указанные выше, чтобы сеанс был освобождён")
        print("Ожидания нажатия клавиши...")
        getch()
        print("Клавиша нажата!")
    except BaseException as e:
        print(e)
        print("Ожидания нажатия клавиши...")
        getch()
        print("Клавиша нажата!")
    except ... as e:
        print(e)
        print("Ожидания нажатия клавиши...")
        getch()
        print("Клавиша нажата!")