@echo off
rem Opens the Basic Robot Lessons update window (OpMode track). Double-click this file.
setlocal
set "APP=%~dp0tools\update_lesson_app.py"

rem The Python launcher (py) comes with the python.org installer. Check for Tk here,
rem in a console, because the window-only pyw would hide the error.
py -3 -c "import tkinter" >nul 2>nul
if %errorlevel%==0 (
  start "" pyw -3 "%APP%"
  exit /b 0
)
python -c "import tkinter" >nul 2>nul
if %errorlevel%==0 (
  start "" pythonw "%APP%"
  exit /b 0
)

echo.
echo   The lesson updater needs Python 3 with Tk, and this computer does not have it yet.
echo   Install Python from python.org - section 4 of docs\lessons\v3\aside-setup.md shows how.
echo.
pause
