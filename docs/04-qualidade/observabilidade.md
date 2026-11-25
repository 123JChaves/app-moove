# Plano de Observabilidade

> Objetivo: responder em minutos às perguntas **"está funcionando?"**, **"está rápido?"** e **"por que falhou?"**.
> Três pilares: **logs estruturados** (implementado), **métricas** (implementado), **rastreamento por correlation ID** (implementado). Tracing distribuído completo (OpenTelemetry) fica como evolução.

## 1. Logs

### Padrão
- **Formato:** JSON, um evento por linha (pino na API e `log_format moove_json` no Nginx).
- **Campos obrigatórios:** `time` (ISO-8601), `nivel`, `servico`, `ambiente`, `modulo`, `msg`.
- **Campos de contexto:** `idRequisicao`, `metodo`, `rota`, `status`, `duracaoMs`, `usuarioId`, `canal`, `eventoId`, `chave`.
- **Nível:** variável `LOG_LEVEL` (padrão `info`; `silent` em testes).
- **Proibido logar:** senhas, tokens JWT, conteúdo de `.env`, CPF completo.

### O que é logado

| Módulo | Evento | Nível |
|---|---|---|
| `HTTP` | Cada requisição (exceto `/health` e `/metrics`): método, rota, status, duração | info / warn (4xx) / error (5xx) |
| `Erro` | Erro de negócio (ApiErro), dependência indisponível, erro não tratado com stack | warn / error |
| `Cache` | HIT, MISS, INVALIDADO, falhas do Redis | info / warn |
| `EventBus` | 📤 Evento PUBLICADO, 📥 Evento RECEBIDO, erro em handler | info / error |
| `Assinantes` | Ação tomada por cada consumidor (sincronização de cache, auditoria da escala) | info |
| `Redis` | Conectado, reconectando, erro | info / warn |
| `Resiliencia` | Retry agendado, circuit breaker aberto/fechado | warn / error |
| `nginx` | Acesso (JSON com `idRequisicao`, `upstreamSeg`) | — |

### Exemplo de um fluxo rastreado pelo `idRequisicao`
```json
{"time":"2026-11-21T20:10:01Z","servico":"moove-nginx","idRequisicao":"7f3c...","metodo":"PUT","url":"/rota/3","status":200,"duracaoSeg":0.084}
{"nivel":"info","modulo":"Cache","prefixo":"rotas:","removidas":3,"msg":"Cache INVALIDADO por prefixo"}
{"nivel":"info","modulo":"EventBus","canal":"moove.rota.alterada","eventoId":"a1b2...","receptores":1,"dados":{"rotaId":3,"acao":"EDITADA"},"msg":"📤 Evento PUBLICADO"}
{"nivel":"info","modulo":"EventBus","canal":"moove.rota.alterada","eventoId":"a1b2...","msg":"📥 Evento RECEBIDO"}
{"nivel":"info","modulo":"HTTP","idRequisicao":"7f3c...","metodo":"PUT","rota":"/rota/:id","status":200,"duracaoMs":81,"msg":"Requisição concluída"}
```

### Coleta (evolução)
Hoje: `docker compose logs -f backend nginx` (ou `npm run docker:logs`).
Próximo passo: **Grafana Loki + Promtail** lendo o stdout dos containers. Os logs já são JSON, então nada muda no código.

## 2. Métricas

Endpoint `GET /metrics` (formato Prometheus, acessível só pela rede interna através do Nginx).

| Métrica | Tipo | Rótulos | Usada em |
|---|---|---|---|
| `moove_up` | gauge | — | disponibilidade do processo |
| `moove_processo_uptime_segundos` | gauge | — | reinícios inesperados |
| `moove_processo_memoria_bytes` | gauge | — | vazamento de memória |
| `moove_http_requisicoes_total` | counter | `metodo`, `rota`, `status` (2xx/4xx/5xx) | **SLO-01** (taxa de erro), throughput |
| `moove_http_duracao_ms_bucket/_sum/_count` | histogram | `metodo`, `rota`, `le` | **SLO-02/03** (p95) |
| `moove_cache_total` | counter | `resultado` (hit/miss/bypass/erro) | **SLO-06** (hit ratio) |
| `moove_cache_invalidacoes_total` | counter | — | volume de escritas |
| `moove_eventos_publicados_total` | counter | `canal`, `resultado` | saúde da mensageria |
| `moove_eventos_recebidos_total` | counter | `canal` | consumidores ativos |

### Métricas do microsserviço de auditoria (`GET /auditoria/metrics`)

| Métrica | Tipo | Rótulos | Usada em |
|---|---|---|---|
| `auditoria_eventos_total` | counter | `canal`, `resultado` (registrado/duplicado/invalido/dlq) | **SLO-07** |
| `auditoria_http_requisicoes_total` | counter | `metodo`, `rota`, `status` | **SLO-08** |
| `auditoria_http_duracao_ms_*` | histogram | `metodo`, `rota`, `le` | latência da consulta |
| `auditoria_up`, `auditoria_uptime_segundos` | gauge | — | reinícios |

Os logs do microsserviço usam o mesmo formato JSON com `servico: "moove-auditoria"`, e o `X-Request-Id` vem do Nginx. Isso permite correlacionar os dois serviços.

### Métricas de negócio (próximas)
- Motoristas na fila por dia; horário em que a escala foi gerada (**SLO-04**); solicitações de corrida por turno.

### Dashboards sugeridos (Grafana)
1. **Visão geral (RED):** Rate, Errors, Duration por rota.
2. **Dependências:** status do MySQL, Redis e WhatsApp (via `/health/ready`) e hit ratio do cache.
3. **Negócio:** escala do dia publicada? quantos motoristas? quantas rotas sem motorista?

## 3. Health checks

| Endpoint | Tipo | Uso |
|---|---|---|
| `/health` | Liveness | `healthcheck` do Docker; o Nginx também expõe |
| `/health/ready` | Readiness | smoke test do deploy, monitor externo (UptimeRobot/Uptime Kuma a cada 1 min) |

## 4. Correlation ID
`X-Request-Id` gerado pelo Nginx (ou recebido do app), propagado para a API, devolvido ao cliente e incluído no corpo dos erros. Com ele, um print de erro enviado pelo administrador leva direto às linhas de log.

## 5. Roadmap
| Fase | Entrega |
|---|---|
| ✅ Agora | Logs JSON, `/metrics`, `/health`, `/health/ready`, correlation ID |
| Próxima sprint | Prometheus + Grafana + Loki no `docker-compose.observabilidade.yml`; alertas da tabela de SLOs |
| Futuro | OpenTelemetry (traces) cobrindo Nginx → API → MySQL/Redis |
