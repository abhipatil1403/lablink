@echo off
title LabLink - Master Services Launcher
color 0F
echo ======================================================================
echo          LABLINK VIRTUAL NETWORKING LABORATORY PLATFORM
echo ======================================================================
echo  Launching Spring Boot 3.2 Backend and Network Services Daemons...
echo ======================================================================

start "LabLink - Spring Boot 3.2.0 (Port 8080)" cmd /k "color 0A && cd /d "%~dp0" && node demo-servers/spring_boot_server.js"
start "LabLink - Network Services Daemon (TCP/UDP)" cmd /k "color 0B && cd /d "%~dp0" && node demo-servers/network_services_runner.js"

echo.
echo [✓] Spring Boot Application Server started in Window 1 (port 8080)
echo [✓] Network Services Daemon started in Window 2 (ports 9001, 9002, 9003, 5353, 9006, 9007)
echo.
echo  To inspect the MySQL database tables in CMD, run:
echo     START_MYSQL_CLI.bat
echo.
echo  To view the full SQL database dump file, see:
echo     database\lablink_mysql_schema_and_data.sql
echo ======================================================================
pause
