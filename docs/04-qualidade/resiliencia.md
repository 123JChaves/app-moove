# Estratégias de Resiliência

> Implementação central: [`whatsappBot/src/infra/resiliencia/Resiliencia.ts`](../../whatsappBot/src/infra/resiliencia/Resiliencia.ts)
> Testes: [`src/__tests__/Resiliencia.test.ts`](../../whatsappBot/src/__tests__/Resiliencia.test.ts)

## Mapa: dependência × falha × estratégia

| Dependência | Modo de falha | Estratégia aplicada | Onde |
|---|---|---|---|
| **MySQL** | Ainda subindo no boot do container | **Retry** com backoff exponencial + jitter (5 tentativas, 1s → 2s → 4s → 5s) | `index.ts` → `comRetry(AppDataSource.initialize)` |
| | Container cai de vez | `restart: unless-stopped` + `healthcheck` + `depends_on: service_healthy` | `docker-compose.yml` |
| | Consulta travada | **Timeout** de 1 s no health check | `RotasSaude.ts` |
| **Redis** | Indisponível | **Degradação graciosa** (bypass do cache: responde pelo MySQL); `enableOfflineQueue: false` (falha rápida) | `RedisClient.ts`, `CacheService.ts` |
| | Lento | **Timeout** de 300 ms por GET/SET do cache e `commandTimeout: 1000` | `CacheService.ts` |
| | Conexão perdida | **Reconexão** automática com backoff (`retryStrategy` até 5 s) e reinscrição nos canais | `RedisClient.ts` |
| | Evento não entregue | Invalidação **síncrona** local + TTL como rede de segurança | services + ADR 0004 |
| **WhatsApp (Baileys)** | Desconexão | Reconexão do Baileys; `VerificarBot` devolve **503** em vez de travar; status no `/health/ready` | `WhatsAppController.ts`, `VerificarBot.ts` |
| | Instabilidade prolongada | **Circuit Breaker** disponível (`CircuitBreaker`: abre após 5 falhas e testa de novo após 30 s) para envio de mensagens externas | `Resiliencia.ts` (ver uso recomendado abaixo) |
| **Microsserviço de Auditoria** | Banco próprio fora | Retry 3x → **Dead Letter Queue** (`moove:auditoria:dlq`) → reprocessamento a cada 60 s | `auditoria/src/consumidores/ConsumidorEventos.ts` |
| | Evento entregue duas vezes (DLQ, réplicas) | **Idempotência** (`INSERT IGNORE` pelo id do evento) | `EventoRepositorio.ts` |
| | Serviço inteiro fora | **Isolamento**: o monólito não depende dele; o Nginx resolve o upstream dinamicamente (502 só em `/auditoria`) | `nginx.conf` |
| **Back-end (para o Nginx)** | Instância lenta/fora | `proxy_connect_timeout 5s`, `proxy_read_timeout 60s`, `max_fails=3 fail_timeout=10s` | `nginx.conf` |
| **Clientes abusivos** | Excesso de requisições | **Rate limit** 20 r/s por IP (rajada de 40) → 429 | `nginx.conf` |
| **Deploy** | Versão defeituosa | **Rollback automático** baseado em health check | `scripts/deploy.sh` |
| **Processo Node** | Erro fatal no boot | `process.exit(1)` → o Docker reinicia; SIGTERM → **encerramento gracioso** (fecha HTTP, Redis, MySQL) | `index.ts` |

## Padrões em detalhe

### 1. Retry com backoff exponencial e jitter
```ts
await comRetry(() => AppDataSource.initialize(), {
  operacao: "mysql.initialize", tentativas: 5, atrasoInicialMs: 1000,
});
```
- **Quando usar:** só em falhas transitórias e em operações **idempotentes** (conectar, ler).
- **Quando NÃO usar:** em escritas não idempotentes (ex.: `gerarEscalaCompleta` disparando mensagens). Repetir poderia duplicar mensagens no grupo.
- **Jitter** evita que várias instâncias tentem de novo ao mesmo tempo (*thundering herd*).

### 2. Timeout
```ts
await comTimeout(cliente.get(chave), 300, "cache.get");
```
Toda chamada a dependência externa precisa de prazo. Sem timeout, uma dependência lenta esgota as conexões do Node.

### 3. Circuit Breaker
```ts
const cbWhatsapp = new CircuitBreaker("whatsapp.envio", 5, 30_000);
await cbWhatsapp.executar(() => botInstance.enviarMensagemExterna(titulo, texto));
```
Estados: **FECHADO** (normal) → **ABERTO** (rejeita na hora com `CircuitoAbertoErro`, que o `MiddlewareErro` traduz em 503) → **MEIO_ABERTO** (testa uma chamada).
**Uso recomendado** (backlog SCRUM-47): envolver `enviarMensagemExterna` nas rotas `/whatsapp/*` para que o app receba 503 rápido quando o WhatsApp estiver instável.

### 4. Degradação graciosa
O Redis é tratado como **otimização, não dependência crítica**: sem ele, o sistema fica mais lento, mas correto. Os testes `"degradação graciosa"` e `"se o Redis falhar na leitura, não derruba a requisição"` comprovam o comportamento.

### 5. Bulkhead (isolamento)
- Conexões Redis separadas para comandos e para `SUBSCRIBE`.
- Um handler de evento com erro não impede os demais (`EventBus.despachar`).
- Limite de memória do Redis (128 MB, LRU), para que o cache não derrube o host.

## Como testar manualmente

```bash
# Redis fora -> API segue respondendo, health = DEGRADED
docker compose stop redis
curl -s http://localhost/health/ready      # "redis":"DOWN","status":"DEGRADED"
curl -s -H "Authorization: Bearer $TOKEN" http://localhost/rotas   # 200 (vindo do MySQL)
docker compose start redis

# MySQL lento no boot -> logs de retry
docker compose restart db backend && docker compose logs -f backend | grep -i "tentativa"
```
