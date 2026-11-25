# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Versionamento [SemVer](https://semver.org/lang/pt-BR/).
Os itens referenciam as chaves reais do Jira (projeto SCRUM) e do backlog ([docs/07-gestao/product-backlog.md](docs/07-gestao/product-backlog.md)).
As datas das versões anteriores à 1.1.0 são aproximadas, reconstruídas a partir das migrations e do histórico de commits.

## [Planejado] – v2.0.0 (entrega final: 30/04/2027)
### Planejado
- **Solicitação de corridas pelos passageiros via WhatsApp** (épico SCRUM-10): solicitar, confirmar e cancelar, prazo limite, lembretes, painel no app e eventos `moove.solicitacao.*`.
- **App do motorista e notificações** (épico SCRUM-11): login por código no WhatsApp, push de novas solicitações, rota do dia e respostas que o bot repassa ao passageiro; microsserviço de notificações com Redis Streams.

## [Não lançado] – v1.2.0 (planejada)
### Planejado
- JWT nas rotas `/whatsapp/*` (SCRUM-42), `synchronize: false` em produção (SCRUM-44), correção da rota duplicada (SCRUM-43).
- Circuit breaker no envio de mensagens (SCRUM-47), logger estruturado no bot (SCRUM-48), stack Grafana/Loki (SCRUM-50).

## [1.1.0] – 2026-11
### Adicionado
- **Redis** no `docker-compose.yml` (128 MB, LRU, healthcheck).
- **Cache-aside com TTL** para rotas, empresas e motoristas, com invalidação nas escritas (SCRUM-30).
- **Microsserviço `moove-auditoria`** (pasta `auditoria/`): consome os eventos `moove.*` via Redis Pub/Sub, grava em **banco próprio** (`db-auditoria`), API `/auditoria/*` com JWT, DLQ, idempotência, retenção, pipeline/imagem/deploy independentes (SCRUM-52, ADR 0008).
- **Eventos de domínio via Redis Pub/Sub**: `moove.rota.alterada`, `moove.empresa.alterada`, `moove.motorista.alterado`, `moove.passageiro.alterado`, `moove.escala.gerada` (SCRUM-31).
- **Logs estruturados** (pino, JSON), middleware de **correlation ID** e métricas Prometheus em `/metrics` (SCRUM-33).
- **Health checks** `/health` e `/health/ready` (SCRUM-34).
- **Resiliência**: retry com backoff na conexão MySQL, timeouts, circuit breaker, encerramento gracioso (SCRUM-35).
- **Pipeline CI/CD** no GitHub Actions + `scripts/deploy.sh` e `scripts/rollback.sh` (SCRUM-36).
- Testes unitários (Jest) de cache, eventos e resiliência.
- **Documentação** completa em `docs/` (SCRUM-37 a SCRUM-41), `.env.example`, `README.md`.
### Corrigido
- `nginx/nginx.conf` sem bloco `server {}` (o Nginx não iniciava). Agora com upstream, TLS, rate limit, logs JSON e `X-Request-Id` (SCRUM-32).
### Alterado
- `MiddlewareErro` passa a responder `idRequisicao` e a mapear timeouts para 503.

## [1.0.1] – 2026-06
### Adicionado
- RBAC (papéis e permissões) com seed automático (SCRUM-27).
- Solicitação de corrida pelo WhatsApp com check no app (SCRUM-24).
- Ajustes manuais na fila e nas rotas, apoio fixo (SCRUM-20, SCRUM-21, SCRUM-25).
- Docker Compose + Nginx com bloqueio de navegação direta (SCRUM-28, SCRUM-29).
- Husky: validação de commits e testes E2E no pre-push.

## [1.0.0] – 2026-05
### Adicionado
- Geração automática da escala às 20:25 (SCRUM-17), dias livres (SCRUM-18), penalização (SCRUM-19).
- Rotas da tarde/madrugada com ordem de passageiros (SCRUM-22, SCRUM-23).
- App mobile de gestão (SCRUM-26).

## [0.5.0] – 2026-05
### Adicionado
- Bot WhatsApp (Baileys): fila de joinhas por reação 👍 e comandos `@` (SCRUM-16).

## [0.1.0] – 2026-04
### Adicionado
- Cadastros de motoristas, empresas, passageiros e endereçamento (SCRUM-12 a SCRUM-15).
- Login com JWT.
