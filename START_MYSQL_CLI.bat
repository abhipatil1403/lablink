@echo off
title LabLink - MySQL 8.0 Client (lablink_db)
color 0E
cd /d "%~dp0"

echo ======================================================================
echo           LABLINK MYSQL 8.0 DATABASE CLIENT - lablink_db
echo ======================================================================
echo  Connected to MySQL Server 8.0 on localhost:3306
echo  Database: lablink_db  ^|  User: root  ^|  Password: mysql@123
echo ======================================================================
echo.

if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" (
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pmysql@123 --default-character-set=utf8mb4 lablink_db
) else if exist "C:\Program Files\MySQL\MySQL Workbench 8.0\mysql.exe" (
    "C:\Program Files\MySQL\MySQL Workbench 8.0\mysql.exe" -u root -pmysql@123 --default-character-set=utf8mb4 lablink_db
) else (
    node demo-servers/mysql_terminal_viewer.js
)
pause
