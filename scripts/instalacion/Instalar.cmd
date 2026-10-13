@echo off
title Instalador Parque Erick Barrondo
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Instalar Sistema.ps1"
if errorlevel 1 (
  echo.
  echo LA INSTALACION REPORTO UN ERROR.
  echo Revisa ERROR-INSTALACION.txt e INSTALACION-ULTIMO.log en esta carpeta.
)
pause
