
[Setup]
AppName=IronClaw Robot Health Monitor
AppVersion=1.0.0
DefaultDirName={userappdata}\IronClawHealthDashboard
DefaultGroupName=IronClaw Tools
UninstallDisplayIcon={app}\frontend\public\logo972.jpg
Compression=lzma2
SolidCompression=yes
OutputDir=.
OutputBaseFilename=IronClaw_HealthMonitor_Setup
; Ensure we don't need Admin rights to install to User AppData
PrivilegesRequired=lowest

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Copy everything from the baseline folder
Source: "C:\Users\aksha\IronClaw-HealthDashboard\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs

[Icons]
Name: "{group}\IronClaw Health Monitor"; FileName: "{app}\build_and_run.bat"; IconFilename: "{app}\frontend\public\logo972.jpg"
Name: "{userdesktop}\IronClaw Health Monitor"; FileName: "{app}\build_and_run.bat"; Tasks: desktopicon; IconFilename: "{app}\frontend\public\logo972.jpg"

[Run]
; Launch the app immediately after install
Filename: "{app}\build_and_run.bat"; Description: "Launch Health Monitor Now"; Flags: postinstall shellexec nowait

[Code]
function InitializeSetup(): Boolean;
var
  ResultCode: Integer;
begin
  Result := True;
  
  // Check for Python
  if not Exec('python', '--version', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    if MsgBox('Python was not found on your system. It is required to run the backend. Would you like to visit the Python download page?', mbConfirmation, MB_YESNO) = idYes then
    begin
      ShellExec('open', 'https://www.python.org/downloads/', '', '', SW_SHOWNORMAL, nil, ResultCode);
    end;
    Result := False;
  end;

  // Check for Node.js
  if Result and (not Exec('node', '--version', '', SW_HIDE, ewWaitUntilTerminated, ResultCode)) then
  begin
    if MsgBox('Node.js was not found on your system. It is required to run the frontend. Would you like to visit the Node.js download page?', mbConfirmation, MB_YESNO) = idYes then
    begin
      ShellExec('open', 'https://nodejs.org/', '', '', SW_SHOWNORMAL, nil, ResultCode);
    end;
    Result := False;
  end;
end;
