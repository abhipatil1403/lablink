@echo off
title LabLink - MySQL 8.0 Terminal Monitor (lablink_db)
color 0E
cd /d "%~dp0"
node demo-servers/mysql_terminal_viewer.js
pause
