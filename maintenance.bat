@echo off

:Maintenance
rem ping is better than sleep or timeout, see http://ss64.com/nt/timeout.html
rem restart all processes every half a hour

echo stop all processes
ping -n 1800 127.0.0.1>nul
taskkill /im phantomjs.exe /f /t

echo delete old log files
forfiles /p ".\output\logs" /s /m *.log /d -7 /C "cmd /c del /q /s @path" > nul

echo start all processes after 10 seconds
ping -n 10 127.0.0.1>nul
start /B .\bin\phantomjs --load-images=false .\src\coordinator.js start > nul

goto :Maintenance
