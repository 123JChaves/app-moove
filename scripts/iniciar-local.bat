@echo off
REM ==================================================================
REM  Inicia o Moove SEM containers - cada servico na sua janela de CMD
REM  Requisitos: MySQL do XAMPP ligado na porta 3306
REM  Uso: na raiz do projeto, rode  npm run local:iniciar
REM ==================================================================
cd /d "%~dp0.."

echo [1/4] Parando os containers da aplicacao, se estiverem ligados...
echo       A sessao do WhatsApp so aceita UMA conexao: backend local e backend Docker nao podem rodar juntos.
docker compose stop backend auditoria nginx frontend >nul 2>&1

echo [2/4] Abrindo janela do BACKEND local, porta 8085...
start "Moove LOCAL - BACKEND" cmd /k "cd /d %cd%\whatsappBot && npm run dev"

echo [3/4] Abrindo janela da AUDITORIA local, porta 8090...
start "Moove LOCAL - AUDITORIA" cmd /k "cd /d %cd%\auditoria && npm run dev"

timeout /t 10 >nul

echo [4/4] Abrindo janela do FRONT-END local - Expo...
start "Moove LOCAL - FRONT-END" cmd /k "cd /d %cd%\jcha_app && npm start"

echo.
echo Pronto! Tres janelas abertas: BACKEND, AUDITORIA e FRONT-END.
echo Teste: npm run local:health   e   npm run local:health:auditoria
echo Tunel para o celular: npm run local:ngrok
exit /b 0
