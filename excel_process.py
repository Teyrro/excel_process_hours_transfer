import datetime
import decimal
import json
import os
import re

from collections import defaultdict
from decimal import getcontext

from os import listdir
from os.path import isfile, join

import math

import fastexcel
import pandas as pd
from openpyxl import load_workbook
from python_calamine._python_calamine import CalamineWorkbook

curr_dir = os.getcwd()
info_dir = "/Информация полученная в процессе работы/"

MONTHS = {
    'январь',
    'февраль',
    'март',
    'апрель',
    'май',
    'июнь',
    'июль',
    'август',
    'сентябрь',
    'октябрь',
    'ноябрь',
    'декабрь'
}

i_dont_know_where_that = {
    "часы",
    "пример бланка па",
    "бланк4"
}


def get_name(sh_name, filename):
    reader = CalamineWorkbook.from_object(filename)
    sheet = reader.get_sheet_by_name(sh_name)
    rows = sheet.to_python(nrows=7, skip_empty_area=True)
    surname = sh_name.split(" ")
    surname = surname[0]
    flag = 0
    for row in rows:
        for word in row:
            if isinstance(word, str) and re.search(f"исполнитель", word.lower()):
                flag = 1
                continue
            if isinstance(word, str) and flag and re.search(f"{surname.lower()}", word.lower()):
                return word
            elif flag == 0:
                continue
            else:
                raise Exception(f"Имя листа {sh_name} в файле {filename} не совпадает с {word}")


def serialize_datetime(obj):
    if isinstance(obj, datetime.timedelta):
        return str(obj)


def get_sh_names(filename):
    try:
        wb = fastexcel.read_excel(filename)
        return wb.sheet_names
    except fastexcel.CalamineError as exp:
        with open("Ошибка при запуске.txt", "w", encoding="utf-8") as f:
            f.write(exp.args[0] + "\n возможно просто закрыть файл")
            raise exp


def get_info_without_null(info: tuple, worker_info: defaultdict,
                          not_included_worker_info: defaultdict, uniq_ords_id: dict):
    for ord_id, hour in info:
        ord_id = ord_id.strip().lower()
        if (ord_id == "" or hour == "" or
                ord_id == "ИТОГО"):
            continue
        new_ord = ord_id
        if ord_id.isnumeric() or re.search(re.compile("цех"), ord_id.lower()):
            new_worker_info = worker_info
            if ord_id.isnumeric():
                if ord_id.split(" ") != 3:
                    new_ord = ord_id[0:2] + " " + ord_id[2:4] + " " + ord_id[4:5] + " " + ord_id[5:8]
                    uniq_ords_id[new_ord] = ""
            else:
                new_ord = "цех"
        else:
            new_worker_info = not_included_worker_info
        try:
            if datetime.time.fromisoformat(hour):
                hour = datetime.timedelta(hours=int(hour[0:2]), minutes=int(hour[3:5]), seconds=int(hour[6:8]))
            new_worker_info[new_ord] += hour
        except ValueError:
            pass


def filter_name_files(name_files: dict[str, str], pattern):
    files_source = {}
    for file, month in name_files.items():
        if re.search(pattern, file.lower()):
            files_source[file] = month
    return files_source


def get_df(file, sh_name, skip_rows):
    return pd.read_excel(file,
                         sheet_name=sh_name,
                         engine="calamine",
                         dtype_backend="pyarrow",
                         skiprows=skip_rows,
                         keep_default_na=False,
                         )


class ExcelProcess:
    pattern_source = r"наряд"
    pattern_order_info = r"план"
    pattern_dest = r"зп"

    def __init__(self):
        print("Загрузка имён файлов .xlsx началась")
        self.files_name: dict[str, str] = self.get_name_files()
        print("Загрузка имён файлов .xlsx окончилась")

        print("Загрузка данных о рабочих началась")
        self.workers_info, not_included_data = self.get_workers_info(self.files_name)
        print("Загрузка данных о рабочих окончилась")

        print("Загрузка номеров заказов из плана производства началась")
        self.get_order_names(self.workers_info)
        print("Загрузка номеров заказов из плана производства окончилась")
        for file, data in {"Все заказы в общем и заказы каждого рабочего.json": self.workers_info,
                           "Не вошедшие в ЗП заказы.json": not_included_data}.items():
            with open(curr_dir + info_dir + file, "w", encoding="utf8") as f:
                f.write(json.dumps(data, default=serialize_datetime, ensure_ascii=False, indent=4))
        print(f"Редактирование файла ЗП началось")
        self.input_date_in_transcript_of_the_pd(self.workers_info)
        print(f"Редактирование файла ЗП окончилось")

    @staticmethod
    def get_name_files() -> dict[str, str]:
        mypath = os.getcwd()
        files: dict[str, str] = {f: "" for f in listdir(mypath) if isfile(join(mypath, f))}

        files_for_deleting = []
        pattern = re.compile(r"наряд|"
                             r"зп|"
                             r"план")
        for file, nothing in files.items():

            patt_res = re.search(pattern, file.lower())

            if (not ((file.endswith(".xlsx") or
                      file.endswith(".xls")) and
                     patt_res)):
                files_for_deleting.append(file)
            else:
                for month in MONTHS:
                    if file.lower().find(month) != -1:
                        files[file] = month
                        break
        for file in files_for_deleting:
            files.pop(file)

        return files

    def get_workers_info(self, files_name):
        files_source = filter_name_files(files_name, self.pattern_source)
        if files_source == {}:
            raise Exception("Не найден файл с именем наряд")
        workers_info = {}
        not_included_info = {}
        uniq_ords_id: dict = {}
        for file, month in files_source.items():

            sheet_names = get_sh_names(file)
            if month not in workers_info:
                workers_info[month] = {}
                not_included_info[month] = {}
            workers_in_month = workers_info[month]
            not_included_in_month = not_included_info[month]
            for sh_name in sheet_names:
                if not sh_name.lower() in i_dont_know_where_that:
                    df = get_df(file, sh_name, 731)
                    sh_name = get_name(sh_name, file)
                    workers_in_month[sh_name] = defaultdict(datetime.timedelta)
                    not_included_in_month[sh_name] = defaultdict(datetime.timedelta)
                    ord_id, hour = df[df.columns[1]], df[df.columns[3]]
                    info: tuple = tuple(sorted(zip(ord_id.tolist(), hour.tolist())))
                    get_info_without_null(info, workers_in_month[sh_name], not_included_in_month[sh_name], uniq_ords_id)
        workers_info[month]["ords"] = dict(sorted(uniq_ords_id.items()))
        workers_info[month] = dict(sorted(workers_info[month].items()))
        return workers_info, not_included_info

    def get_order_names(self, workers_info):
        file = list(filter_name_files(self.files_name, self.pattern_order_info).keys())[0]

        for month in workers_info.keys():
            sheet_names = get_sh_names(file)
            check_month = {name.lower(): ind for ind, name in enumerate(sheet_names)}

            workers_info_in_month = workers_info[month]
            ords: dict[str, str] = workers_info_in_month["ords"]
            if month.lower() not in check_month:
                continue
            df = get_df(file, check_month[month], 9)
            df = df[["№ заказа", "Наименование детали, узла, продукции, вида ремонта"]].where(
                df["№ заказа"] != "").dropna()
            uniq_ords_id = {
                row[0]: row[1]
                for row in df[["№ заказа",
                               "Наименование детали, узла, продукции, вида ремонта"]].to_numpy()
                if len(row[0].split(" ")) == 4}
            for ord_id, name in uniq_ords_id.items():
                if ord_id in ords:
                    ords[ord_id] = name
            workers_info_in_month["ords"] = ords

    def input_date_in_transcript_of_the_pd(self, workers_info: dict):

        file_dest = list(filter_name_files(self.files_name, self.pattern_dest).keys())[0]

        sheet_names = get_sh_names(file_dest)
        check_month = {name.lower().strip(): ind for ind, name in enumerate(sheet_names)}
        for month in workers_info.keys():
            workers_info_in_month = workers_info[month]
            uniq_ords_id = workers_info_in_month["ords"]
            twenty_third = {ord_id: name for ord_id, name in uniq_ords_id.items() if ord_id.startswith("00 07")}
            uniq_ords_id = {ord_id: name for ord_id, name in uniq_ords_id.items() if ord_id not in twenty_third}
            uniq_ords_id = {**twenty_third, **uniq_ords_id}
            uniq_ords_id = list(uniq_ords_id.items())
            if month.lower() not in check_month:
                continue
            month_ind = check_month[month]
            wb = load_workbook(file_dest)
            ws = wb.get_sheet_by_name(sheet_names[month_ind])

            cell_rows = [5, 4]
            start_cell_cols = 4
            step_cell_cols = 2
            uniq_ords_col_ids = {}
            for ind_tuple, row in enumerate(cell_rows):
                for col, order in enumerate(uniq_ords_id, start=start_cell_cols):
                    col *= step_cell_cols
                    if ind_tuple == 0:
                        uniq_ords_col_ids[order[0]] = col
                    ws.cell(row=row,
                            column=col,
                            value=order[ind_tuple])
            uniq_ords_col_ids["цех"] = 136 * 2

            not_existed_names: dict = {}
            row_ind = 9
            names_for_delete = []
            while True:
                name = ws.cell(row=row_ind, column=2).value
                if isinstance(name, str):
                    if name in workers_info_in_month:
                        names_for_delete.append(name)
                        worker_info = workers_info_in_month[name].items()
                        hours = 0
                        for col, ord_info in enumerate(worker_info,
                                                       start=start_cell_cols):
                            ord_id, hour = ord_info
                            # hour = datetime.time(hour=int(hour[0:2]), minute=int(hour[4:6]), second=int(hour[6:8]))

                            getcontext().prec = 5
                            hour = decimal.Decimal(hour.seconds) / 3600 + decimal.Decimal(hour.days) * 24
                            hours += hour
                            col = uniq_ords_col_ids[ord_id.lower()]
                            ws.cell(row=row_ind,
                                    column=col,
                                    value=hour)
                        ws.cell(row=row_ind, column=5, value=hours)
                    elif name.lower() == "итого":
                        break
                    else:
                        not_existed_names[name] = None
                    row_ind += 1
                else:
                    break
            for name in names_for_delete:
                workers_info_in_month.pop(name)
            if len(not_existed_names) > 0:
                names_from_outfit: dict = {"Имена взяты из ЗП, которым не нашли пару": not_existed_names,
                                           "Имена взяты из нарядов, которым не нашли пару": list(workers_info_in_month.keys()),
                                           "Пояснение": ["Если слово не совпадёт хоть на пробел, оно не учтётся, ",
                                                         "данные "
                                                         "берутся из наряда справа-сверху в ячейке исполнитель.",
                                                         "",
                                                         "Просто сверь именя взятые из ЗП с именами взятыми из нарядов",
                                                         "",
                                                         "Самый редкий случай, когда кто-то вместо русской С добавил "
                                                         "английскую C",
                                                         "Разницу не заметит никто, кроме программы"],
                                           }
            else:
                names_from_outfit = {"Всё окей по мнению программы": None}
            with open(curr_dir + info_dir + "ФИО которых нет в ЗП.json", "w", encoding="utf8") as f:
                f.write(json.dumps(names_from_outfit, default=serialize_datetime, ensure_ascii=False, indent=4))

            wb.save(file_dest)
