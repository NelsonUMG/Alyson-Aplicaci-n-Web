@echo off
title Parque Erick Barrondo - Frontend
set "PUERTO_WEB=5173"
set "NODE=node.exe"
if exist "%~dp0runtime\node\node.exe" set "NODE=%~dp0runtime\node\node.exe"
"%NODE%" "%~dp0scripts\Servidor Web.mjs"
pause
