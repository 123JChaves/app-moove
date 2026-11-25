@echo off
REM ==================================================================
REM  Publica os 3 repositorios do Moove no GitHub numa branch nova
REM  e mostra os links para abrir os Pull Requests.
REM  Uso: na raiz do projeto, rode  scripts\publicar-github.bat
REM ==================================================================
setlocal
cd /d "%~dp0.."
set "RAIZ=%cd%"
set "BRANCH=SCRUM-52-entrega-sprint-5"

git config user.name >nul 2>&1
if errorlevel 1 goto semgit

call :publicar "%RAIZ%\whatsappBot" "feat(backend): rbac, redis cache-aside e pub/sub, observabilidade e resiliencia SCRUM-52" "Cache-aside com TTL e invalidacao, eventos de dominio no Redis Pub/Sub, logs JSON, health, metrics, retry, timeout, circuit breaker e testes unitarios."
if errorlevel 1 goto falhou
call :publicar "%RAIZ%\jcha_app" "feat(app): papeis e permissoes nas telas de gestao SCRUM-52" "Ajustes nas telas de administradores, empresas e login para o RBAC."
if errorlevel 1 goto falhou
call :publicar "%RAIZ%" "feat: microsservico de auditoria, documentacao arquitetural, ci/cd e gestao SCRUM-52" "Microsservico moove-auditoria com banco proprio, docs-as-code com C4, ADRs, DDD, OpenAPI, SLOs e runbook, pipeline GitHub Actions, Nginx corrigido e scripts de execucao e diagnostico."
if errorlevel 1 goto falhou

echo.
echo ================================================================
echo  Pronto! Abra os Pull Requests e faca o merge na main:
echo  https://github.com/123JChaves/whatsappBot/compare/main...%BRANCH%?expand=1
echo  https://github.com/123JChaves/jcha_app/compare/main...%BRANCH%?expand=1
echo  https://github.com/123JChaves/app-moove/compare/main...%BRANCH%?expand=1
echo ================================================================
goto fim

:semgit
echo Configure seu nome e e-mail do Git antes de rodar este script:
echo   git config --global user.name "Seu Nome"
echo   git config --global user.email "seu@email.com"
goto fim

:falhou
echo.
echo Publicacao interrompida. Veja a mensagem de erro acima.
goto fim

REM ------------------------------------------------------------------
:publicar
set "REPO=%~1"
set "TITULO=%~2"
set "CORPO=%~3"
set "MSG=%TEMP%\moove-commit.txt"
echo.
echo ================================================================
echo  Repositorio: %REPO%
echo ================================================================
cd /d "%REPO%"
git rev-parse --verify --quiet "%BRANCH%" >nul
if errorlevel 1 goto criarbranch
git checkout "%BRANCH%"
goto adicionar
:criarbranch
git checkout -b "%BRANCH%"
:adicionar
if errorlevel 1 exit /b 1
git add -A
git diff --cached --quiet
if errorlevel 1 goto commitar
echo Nada novo para commitar aqui.
goto enviar
:commitar
> "%MSG%" echo %TITULO%
>> "%MSG%" echo.
>> "%MSG%" echo %CORPO%
>> "%MSG%" echo.
>> "%MSG%" echo Co-Authored-By: Claude Opus 5.5 ^<noreply@anthropic.com^>
>> "%MSG%" echo Claude-Session: https://claude.ai/code/session_01ToSonUDmNhYco6mJ4JmNTN
git commit -F "%MSG%"
if errorlevel 1 exit /b 1
:enviar
git push -u origin "%BRANCH%"
if not errorlevel 1 exit /b 0
echo.
echo O envio falhou. Se o motivo foi o hook de pre-push, que roda os testes E2E e precisa do backend no ar,
set "RESP=n"
set /p RESP=deseja enviar mesmo assim, sem rodar os testes? s/n: 
if /I not "%RESP%"=="s" exit /b 1
git push --no-verify -u origin "%BRANCH%"
exit /b %errorlevel%

:fim
cd /d "%RAIZ%"
endlocal
