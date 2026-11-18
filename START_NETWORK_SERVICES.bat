@echo off
title LabLink - Network Services Daemon (Ports 9001, 9002, 9003, 5353, 9006, 9007)
color 0B
cd /d "%~dp0"
node demo-servers/network_services_runner.js
pause
