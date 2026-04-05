@echo off
color 0b
title Nexus AI - Installer
echo ====================================================
echo             Nexus AI Desktop Installer
echo ====================================================
echo.
set "APP_DIR=%LocalAppData%\Programs\NexusAI"
echo [*] Removing older versions...
if exist "%APP_DIR%" rmdir /s /q "%APP_DIR%"
echo [*] Creating application directory...
mkdir "%APP_DIR%"

echo [*] Copying application files...
xcopy /e /y "%~dp0*.*" "%APP_DIR%\" >nul

echo [*] Locating Microsoft Edge...
set "EDGE_PATH=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
FOR /F "tokens=2*" %%A IN ('REG QUERY "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe" /ve 2^>nul') DO SET "EDGE_PATH=%%B"

echo [*] Creating Desktop Shortcut...
set "VBS_SCRIPT=%temp%\nexus_shortcut.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%VBS_SCRIPT%"
echo sLinkFile = "%USERPROFILE%\Desktop\Nexus AI.lnk" >> "%VBS_SCRIPT%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%VBS_SCRIPT%"
echo oLink.TargetPath = "%EDGE_PATH%" >> "%VBS_SCRIPT%"
echo oLink.Arguments = "--app=""file:///%APP_DIR:\=/%/index.html""" >> "%VBS_SCRIPT%"
echo oLink.Description = "Nexus AI Premium Chat" >> "%VBS_SCRIPT%"
echo oLink.IconLocation = "%APP_DIR%\avatar.ico" >> "%VBS_SCRIPT%"
echo oLink.Save >> "%VBS_SCRIPT%"
cscript /nologo "%VBS_SCRIPT%"
del "%VBS_SCRIPT%"

echo.
echo ====================================================
echo    SUCCESS: Nexus AI has been installed!
echo    You can open it from your Desktop.
echo ====================================================
pause
