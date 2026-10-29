@echo off
REM ============================================================
REM  SaudeConecta - Agenda o backup.bat para todo dia as 12:00
REM  (Agendador de Tarefas do Windows; roda assim que o computador
REM  ligar se ele estiver desligado no horario). Uma vez so.
REM ============================================================
setlocal
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0backup.ps1" -Acao agendar
pause
