; Установщик для Windows (Inno Setup 6). Собирается в GitHub Actions:
;   iscc /DAppVersion=1.0.0 installer.iss
; Перед этим PyInstaller должен положить приложение в dist\HoursTransfer.

#define AppName "Перенос часов"
#define AppExe "HoursTransfer.exe"
#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif

[Setup]
; AppId не менять: по нему новая версия ставится поверх старой
AppId={{F44642ED-50E9-41CF-8458-1AB3390D8BD0}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher=Воропаев Кирилл
AppPublisherURL=https://github.com/Teyrro/excel_process_hours_transfer
; Ставим в профиль пользователя — права администратора не нужны
PrivilegesRequired=lowest
DefaultDirName={localappdata}\Programs\HoursTransfer
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
DisableDirPage=yes
OutputDir=dist\installer
OutputBaseFilename=HoursTransfer-Setup
SetupIconFile=assets\icon.ico
UninstallDisplayIcon={app}\{#AppExe}
UninstallDisplayName={#AppName}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
; Если программа открыта, установщик и удаление предложат её закрыть
CloseApplications=yes

[Languages]
Name: "ru"; MessagesFile: "compiler:Languages\Russian.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "dist\HoursTransfer\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExe}"; WorkingDir: "{app}"
Name: "{group}\Удалить «{#AppName}»"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExe}"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExe}"; Description: "{cm:LaunchProgram,{#AppName}}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; Файлы, которые программа создаёт сама, — чтобы после удаления папка не оставалась
Type: files; Name: "{app}\Ошибка при запуске.txt"
Type: filesandordirs; Name: "{app}\Информация полученная в процессе работы"
Type: dirifempty; Name: "{app}"
; Настройки пользователя: имя, музыка, последняя сцена
Type: filesandordirs; Name: "{userappdata}\HoursTransfer"
