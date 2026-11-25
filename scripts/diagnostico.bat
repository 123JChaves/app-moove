@echo off
REM ==================================================================
REM  Diagnostico completo do ambiente Docker do Moove
REM  Uso: na raiz do projeto, rode  scripts\diagnostico.bat
REM  Resultado: C:\app-moove\diagnostico.txt
REM ==================================================================
chcp 65001 >nul
cd /d "%~dp0.."
set "SAIDA=%cd%\diagnostico.txt"
echo Executando diagnostico... aguarde, cerca de 30 segundos
call :testes > "%SAIDA%" 2>&1
echo Pronto. Resultado salvo em %SAIDA%
exit /b 0

:testes
echo ===== DIAGNOSTICO %date% %time% =====
echo.
echo ### 1. CONTAINERS
docker compose ps -a
echo.
echo ### 2. HEALTH DO BACKEND VIA NGINX - 127.0.0.1 - 5 tentativas
for /L %%i in (1,1,5) do curl.exe -s -o nul -m 10 -w "tentativa %%i: HTTP %%{http_code}  tempo %%{time_total}s\n" http://127.0.0.1:8080/health/ready
echo.
curl.exe -i -S -m 10 http://127.0.0.1:8080/health/ready
echo.
echo.
echo ### 3. HEALTH DO BACKEND VIA NGINX - localhost
curl.exe -i -S -m 10 http://localhost:8080/health/ready
echo.
echo.
echo ### 4. HEALTH DA AUDITORIA VIA NGINX - 5 tentativas
for /L %%i in (1,1,5) do curl.exe -s -o nul -m 10 -w "tentativa %%i: HTTP %%{http_code}  tempo %%{time_total}s\n" http://127.0.0.1:8080/auditoria/health/ready
echo.
curl.exe -i -S -m 10 http://127.0.0.1:8080/auditoria/health/ready
echo.
echo.
echo ### 5. HEALTH DENTRO DOS CONTAINERS
docker compose exec -T backend wget -qO- http://127.0.0.1:8085/health/ready
echo.
docker compose exec -T auditoria wget -qO- http://127.0.0.1:8090/auditoria/health/ready
echo.
echo.
echo ### 6. QUEM ESTA OUVINDO NA PORTA 8080
netstat -ano | findstr ":8080 " | findstr LISTENING
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8080 " ^| findstr LISTENING') do tasklist /FI "PID eq %%p" /NH
echo.
echo ### 6.1 USO DE CPU E MEMORIA DOS CONTAINERS
docker stats --no-stream
echo.
echo ### 6.2 PROCESSOS NODE NO WINDOWS - um backend local rodando junto disputa a sessao do WhatsApp
wmic process where "name='node.exe'" get ProcessId,CommandLine 2>nul
echo.
echo ### 6.3 CONEXAO DO WHATSAPP NOS ULTIMOS 60 MINUTOS
docker compose logs --since 60m backend 2>&1 | findstr /I /C:"conexao" /C:"conex" /C:"codigo" /C:"QR" /C:"conectado" /C:"reconect" /C:"encerrada"
echo.
echo ### 6.4 SESSAO DO WHATSAPP
docker compose exec -T backend sh -c "echo dir=$WHATSAPP_SESSAO_DIR; ls $WHATSAPP_SESSAO_DIR 2>/dev/null | wc -l"
echo.
echo ### 7. METRICAS DO BACKEND
docker compose exec -T backend wget -qO- http://127.0.0.1:8085/metrics
echo.
echo ### 8. LOGS NGINX
docker compose logs --tail 30 nginx
echo.
echo ### 9. LOGS BACKEND
docker compose logs --tail 150 backend
echo.
echo ### 10. LOGS AUDITORIA
docker compose logs --tail 40 auditoria
echo.
echo ===== FIM =====
exit /b 0
