@echo off
REM ============================================================
REM  SaudeConecta - Compila a aplicacao Java (sem Maven)
REM  Gera as classes na pasta out\
REM ============================================================
setlocal
cd /d "%~dp0"

REM === Configuracao do JDK (Java 17) ===========================
REM Se voce instalar um JDK e adicionar ao PATH, deixe:  set "JAVA_BIN="
set "JAVA_BIN=D:\caio1\Videos\datamodeler-24.3.1.351.0831-x64\datamodeler\jdk\jre\bin"
REM ============================================================

if defined JAVA_BIN (set "JAVAC=%JAVA_BIN%\javac.exe") else (set "JAVAC=javac")

if not exist out mkdir out

dir /s /b src\*.java > sources.txt
echo Compilando...
"%JAVAC%" -encoding UTF-8 -d out @sources.txt
set ERRO=%ERRORLEVEL%
del sources.txt

if %ERRO% NEQ 0 (
  echo.
  echo [ERRO] Falha na compilacao.
) else (
  echo.
  echo [OK] Compilacao concluida. Classes em out\
)
endlocal
