# 🧾 moove-auditoria – Microsserviço de Auditoria

Serviço **independente** do Moove que mantém o **histórico auditável** de tudo o que acontece no domínio: escalas geradas, rotas, motoristas, passageiros e empresas alterados.

| Característica de microsserviço | Como é atendida |
|---|---|
| Responsabilidade única (bounded context) | Contexto **Auditoria**: registrar e consultar eventos de domínio |
| Deploy independente | Código, `Dockerfile`, imagem, container e job de CI próprios; `./scripts/deploy.sh <sha> auditoria` |
| Banco próprio (*database-per-service*) | Container `db-auditoria` (MySQL 8, database `moove_auditoria`). O monólito não acessa esse banco e o serviço não acessa o banco do monólito |
| Comunicação assíncrona | Consome os eventos `moove.*` via **Redis Pub/Sub** (`PSUBSCRIBE`) |
| Comunicação síncrona | API REST `/auditoria/*` exposta pelo **Nginx** |
| Isolamento de falhas | Se ele cair, o monólito segue normal. Se o monólito cair, a consulta ao histórico continua |
| Segurança | Valida o **JWT** emitido pelo `POST /login` do monólito (mesmo `JWT_SECRET`), de forma stateless |
| Observabilidade | Logs JSON (pino), `X-Request-Id`, `/auditoria/metrics` (Prometheus), `/auditoria/health` e `/health/ready` |
| Resiliência | Retry com backoff (MySQL e gravação), DLQ no Redis com reprocessamento a cada 60 s, idempotência por `id`, reassinatura automática |

## Endpoints

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/auditoria/health` | — | Liveness |
| GET | `/auditoria/health/ready` | — | Readiness: MySQL próprio (crítico), Redis, tamanho da DLQ |
| GET | `/auditoria/metrics` | rede interna | Métricas Prometheus |
| GET | `/auditoria/eventos?tipo=&de=&ate=&pagina=&tamanho=` | JWT | Lista paginada (máx. 100 por página) |
| GET | `/auditoria/eventos/{id}` | JWT | Detalhe de um evento |
| GET | `/auditoria/resumo?dias=` | JWT | Total e último evento por tipo |
| POST | `/auditoria/dlq/reprocessar` | JWT | Força o reprocessamento da DLQ |

Contrato completo: [`docs/03-api/auditoria-openapi.yaml`](../docs/03-api/auditoria-openapi.yaml)

## Estrutura

```
src/
├── index.ts               # bootstrap, jobs (DLQ, retenção), shutdown gracioso
├── app.ts                 # fábrica do Express (injeção de dependências)
├── config.ts              # variáveis de ambiente
├── dtos/Evento.ts         # contratos de entrada/saída
├── erros/ApiErro.ts       # 400 / 401 / 404
├── repositorios/          # porta + adaptador MySQL (SQL parametrizado)
├── servicos/              # regras: validação do envelope, idempotência, filtros, retenção
├── consumidores/          # assinante Redis Pub/Sub + DLQ
├── controllers/           # adaptação HTTP
├── middlewares/           # observabilidade, autenticação JWT, erros
├── infra/                 # logger, métricas, resiliência, banco, redis
└── __tests__/             # 14 testes (service, consumidor, API com supertest)
```

## Rodando

```bash
# Com Docker (na raiz do projeto)
docker compose up -d --build db-auditoria redis auditoria
curl -s http://localhost:8080/auditoria/health/ready

# Local
cd auditoria && npm install
AUDITORIA_DB_HOST=localhost AUDITORIA_DB_PASSWORD=... JWT_SECRET=... npm run dev

# Testes
npm test
```

## Variáveis de ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | 8090 | Porta HTTP |
| `JWT_SECRET` | — | O mesmo do back-end principal |
| `AUDITORIA_EXIGIR_JWT` | true | `false` só para desenvolvimento |
| `AUDITORIA_DB_HOST` / `_PORT` / `_USER` / `_PASSWORD` / `_NAME` | localhost / 3306 / auditoria / — / moove_auditoria | Banco próprio |
| `REDIS_HOST` / `REDIS_PORT` | localhost / 6379 | Barramento de eventos |
| `AUDITORIA_CANAIS` | `moove.*` | Padrão de assinatura |
| `AUDITORIA_RETENCAO_DIAS` | 180 | Eventos mais antigos são apagados (LGPD) |
| `AUDITORIA_INTERVALO_DLQ_MS` | 60000 | Intervalo de reprocessamento da DLQ |
| `LOG_LEVEL` | info | Nível de log |
