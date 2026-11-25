@echo off
REM ==================================================================
REM  Inicia o Moove com cada servico na sua propria janela de CMD
REM  Uso: na raiz do projeto, rode  scripts\iniciar.bat
REM  Para parar um servico: Ctrl+C na janela dele
REM  Para parar tudo: docker compose stop
REM ==================================================================
cd /d "%~dp0.."

echo ATENCAO: feche antes as janelas do modo LOCAL, se estiverem abertas - a sessao do WhatsApp so aceita uma conexao.
echo [1/5] Subindo infraestrutura em segundo plano: MySQL, Redis, MySQL da auditoria...
docker compose up -d db redis db-auditoria
if errorlevel 1 goto erro

echo [2/5] Abrindo janela do BACKEND...
start "Moove - BACKEND (API + WhatsApp)" cmd /k "cd /d %cd% && docker compose up backend"

echo [3/5] Abrindo janela da AUDITORIA...
start "Moove - AUDITORIA (microsservico)" cmd /k "cd /d %cd% && docker compose up auditoria"

echo Aguardando o backend iniciar para subir o Nginx...
timeout /t 20 >nul

echo [4/5] Subindo o NGINX em segundo plano, porta 8080...
docker compose up -d --no-deps nginx

echo [5/5] Abrindo janela do FRONT-END - Expo...
start "Moove - FRONT-END (Expo)" cmd /k "cd /d %cd% && docker compose up frontend"

echo.
echo Pronto! Tres janelas foram abertas: BACKEND, AUDITORIA e FRONT-END.
echo Para conferir tudo: npm run docker:diagnostico
exit /b 0

:erro
echo.
echo Falha ao subir a infraestrutura. O Docker Desktop esta aberto?
exit /b 1
