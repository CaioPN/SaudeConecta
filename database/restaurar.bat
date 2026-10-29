@echo off
REM ============================================================
REM  SaudeConecta - Restaura o banco a partir de um backup
REM    restaurar.bat                 usa o backup mais recente
REM    restaurar.bat caminho.sql     usa este arquivo
REM    restaurar.bat --teste         faz um backup novo, carrega num banco
REM                                  a parte e confere as contagens (o banco
REM                                  real nao e tocado)
REM  Pede a senha do root do MySQL. Detalhes em backup.ps1.
REM ============================================================
setlocal
chcp 65001 >nul
if /i "%~1"=="--teste" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0backup.ps1" -Acao teste
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0backup.ps1" -Acao restaurar -Arquivo "%~1"
)
set "RC=%ERRORLEVEL%"
pause
exit /b %RC%
