#!/bin/bash
# Opens the Basic Robot Lessons update window (OpMode track). Double-click this
# file in Finder, or run it from a terminal on macOS or Linux.
cd "$(dirname "$0")" || exit 1
for py in python3 /usr/local/bin/python3 /opt/homebrew/bin/python3 /usr/bin/python3; do
  if command -v "$py" >/dev/null 2>&1 && "$py" -c 'import tkinter' 2>/dev/null; then
    exec "$py" tools/update_lesson_app.py
  fi
done
echo
echo "  The lesson updater needs Python 3 with Tk, and this computer doesn't have it yet."
echo "  macOS: install Python from python.org. Linux: install python3-tk."
echo "  Section 4 of docs/lessons/v3/aside-setup.md has the details."
echo
read -r -p "Press Return to close. "
