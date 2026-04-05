[Setup]
AppName=Nexus AI
AppVersion=2.0.0
AppPublisher=Nexus AI Ltd.
DefaultDirName={localappdata}\Programs\NexusAI
DefaultGroupName=Nexus AI
OutputDir=.
OutputBaseFilename=NexusAI-Setup
WizardImageFile=wiz.bmp
WizardSmallImageFile=wiz_small.bmp
Compression=lzma2/ultra
SolidCompression=yes
PrivilegesRequired=lowest
DisableDirPage=no

[Files]
Source: "index.html"; DestDir: "{app}"; Flags: ignoreversion
Source: "script.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "style.css"; DestDir: "{app}"; Flags: ignoreversion
Source: "avatar.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "avatar.png"; DestDir: "{app}"; Flags: ignoreversion
Source: "manifest.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "sw.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "app_data.pak"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{userdesktop}\Nexus AI"; Filename: "{code:GetEdgeLocation}"; Parameters: "--app=""file:///{app}/index.html"""; IconFilename: "{app}\avatar.ico"
Name: "{userprograms}\Nexus AI"; Filename: "{code:GetEdgeLocation}"; Parameters: "--app=""file:///{app}/index.html"""; IconFilename: "{app}\avatar.ico"

[Code]
function GetEdgeLocation(Param: String): String;
var
  EdgePath: String;
begin
  if RegQueryStringValue(HKLM, 'SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe', '', EdgePath) then
  begin
    Result := EdgePath;
  end
  else if RegQueryStringValue(HKCU, 'SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe', '', EdgePath) then
  begin
    Result := EdgePath;
  end
  else
  begin
    Result := ExpandConstant('{pf32}\Microsoft\Edge\Application\msedge.exe');
  end;
end;
