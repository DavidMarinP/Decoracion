@echo off
title Visor 3D Decoracion - Servidor Local
echo ========================================================
echo   Iniciando Visor 3D de Arquitectura e Interiorismo
echo ========================================================
echo.
echo Abriendo http://localhost:8080 en tu navegador predeterminado...
start "" http://localhost:8080
echo.
echo ========================================================
echo   CONEXION DESDE EL MOVIL (SIN CABLES):
echo   Conecta el movil al mismo Wi-Fi y abre la direccion
echo   IP que aparecera a continuacion (o pulsa 'Ver en Movil')
echo ========================================================
echo.
echo Presiona Ctrl+C para detener el servidor cuando termines.
echo.
python server.py
if %ERRORLEVEL% NEQ 0 (
  echo Fallo al iniciar server.py, iniciando servidor estatico basico...
  python -m http.server 8080
)
pause
