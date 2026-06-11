@echo off
REM ============================================================
REM  SaudeConecta - Sobe a API REST em Java (porta 3001)
REM  Inclui o driver do MySQL (lib\mysql-connector-j.jar) no classpath
REM  Substitui o antigo backend Node/Express.
REM ============================================================
setlocal
cd /d "%~dp0"

REM Usa UTF-8 no console para exibir acentos e simbolos corretamente
chcp 65001 >nul

REM === Configuracao do JDK (Java 17) ===========================
REM Se instalar um JDK no PATH, deixe:  set "JAVA_BIN="
set "JAVA_BIN=D:\caio1\Videos\datamodeler-24.3.1.351.0831-x64\datamodeler\jdk\jre\bin"
REM ============================================================

if defined JAVA_BIN (set "JAVA=%JAVA_BIN%\java.exe") else (set "JAVA=java")

if not exist out (
  echo [AVISO] Pasta out\ nao encontrada. Rode compilar.bat primeiro.
  exit /b 1
)

"%JAVA%" -cp "out;lib\mysql-connector-j.jar" br.com.hackgov.api.ApiServer
endlocal
