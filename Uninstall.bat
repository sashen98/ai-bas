@echo off
color 0c
title Nexus AI - Uninstaller
echo ====================================================
echo            Nexus AI Desktop Uninstaller
echo ====================================================
echo.
set "APP_DIR=%LocalAppData%\Programs\NexusAI"
set "SHORTCUT=%USERPROFILE%\Desktop\Nexus AI.lnk"

echo [*] Removing application files...
if exist "%APP_DIR%" rmdir /s /q "%APP_DIR%"
echo [*] Removing Desktop Shortcut...
if exist "%SHORTCUT%" del "%SHORTCUT%"

echo.
echo ====================================================
echo    SUCCESS: Nexus AI has been completely removed.
echo ====================================================
pause
