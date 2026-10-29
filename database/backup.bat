@echo off
REM ============================================================
REM  SaudeConecta - Backup do banco MySQL
REM  Grava ..\backups\saudeconecta-AAAA-MM-DD_HHMMSS.sql com a conta
REM  da API (db.usuario/db.senha do config.properties) e mantem os
REM  14 mais recentes. Detalhes em backup.ps1.
REM  --silencioso: sem pausa no fim (usado pela tarefa agendada).
REM ============================================================
setlocal
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0backup.ps1" -Acao backup
set "RC=%ERRORLEVEL%"
if /i not "%~1"=="--silencioso" pause
exit /b %RC%
