# C4 – Nível 2: Diagrama de Containers

> **Pergunta respondida:** *quais são as unidades executáveis/implantáveis do Moove e como elas se comunicam?*
> Cada container abaixo corresponde a um serviço do [`docker-compose.yml`](../../docker-compose.yml).

```mermaid
C4Container
    title Moove - Diagrama de Containers (C4 Nível 2)

    Person(admin, "Administrador", "Opera pelo app")
    Person(motorista, "Motorista / Passageiro", "Interage pelo WhatsApp")
    System_Ext(whatsapp, "WhatsApp", "Plataforma de mensagens")

    System_Boundary(moove, "Moove (docker compose / rede app_network)") {
        Container(app, "App Mobile", "React Native + Expo, TypeScript, Axios", "Telas de cadastro, escala, rotas da tarde/madrugada e plantões.")
        Container(nginx, "Proxy Reverso", "Nginx (alpine)", "TLS, rate limit, bloqueio de navegação direta, Correlation ID, WebSocket, logs JSON.")
        Container(api, "API + Bot (monólito modular)", "Node.js 20, Express 5, TypeORM, Baileys, node-cron", "REST API, regras de escala, bot do WhatsApp, jobs agendados, health/metrics.")
        ContainerDb(mysql, "Banco relacional", "MySQL 8", "Cadastros, filas de joinhas, atribuições, solicitações, RBAC.")
        ContainerDb(redis, "Cache + Mensageria", "Redis 7", "Cache-aside com TTL e canais Pub/Sub de eventos de domínio.")
        Container(aud, "Microsserviço de Auditoria", "Node.js 20, Express 5, mysql2, ioredis", "Consome eventos moove.* e expõe o histórico em /auditoria.")
        ContainerDb(dbaud, "Banco da Auditoria", "MySQL 8", "moove_auditoria – exclusivo do microsserviço.")
    }

    Rel(admin, app, "Usa")
    Rel(app, nginx, "Chamadas REST", "HTTPS :443 / HTTP :80, JSON, JWT")
    Rel(nginx, api, "Proxy reverso", "HTTP :8085")
    Rel(api, mysql, "Lê/grava", "TCP :3306 (TypeORM)")
    Rel(api, redis, "GET/SET com TTL, PUBLISH/SUBSCRIBE", "TCP :6379 (ioredis)")
    Rel(api, whatsapp, "Recebe reações/comandos e envia mensagens", "WebSocket (Baileys)")
    Rel(nginx, aud, "Proxy /auditoria/*", "HTTP :8090")
    Rel(redis, aud, "Entrega eventos", "PSUBSCRIBE moove.*")
    Rel(aud, dbaud, "Grava/consulta histórico", "TCP :3306")
    Rel(motorista, whatsapp, "👍 / @comandos")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

## Containers

| Container | Tecnologia | Responsabilidade | Porta / exposição |
|---|---|---|---|
| **frontend** (`jcha_app`) | Expo 57, React Native, TypeScript | Interface do administrador | `8081` (Metro), perfil `front` |
| **nginx** | `nginx:alpine` | Única porta de entrada; TLS (`nginx/certs`), rate limit 20 req/s por IP, bloqueio de acesso direto pelo navegador, propagação de `X-Request-Id`, `/health` público, `/metrics` só na rede interna | `${NGINX_HTTP_PORT}:80`, `${NGINX_HTTPS_PORT}:443` |
| **backend** (`whatsappBot`) | Node 20, Express 5, TypeORM 0.3, Baileys 7, pino, ioredis | REST API, bot do WhatsApp, cron (geração de escala às 20:25, banimentos às 20:05, rotas da madrugada às 16:00), RBAC/JWT | `8085` apenas na rede interna (`expose`) |
| **db** | MySQL 8.0 | Persistência transacional | `3306` apenas interno, volume `db_data` |
| **redis** | Redis 7 alpine | Cache distribuído (LRU, 128 MB, sem persistência) + barramento Pub/Sub | `6379` apenas interno |
| **auditoria** (`auditoria/`) – **microsserviço** | Node 20, Express 5, mysql2, ioredis, pino | Consome `moove.*`, grava o histórico de forma idempotente, API `/auditoria/*` com JWT, DLQ, retenção de 180 dias | `8090` apenas interno |
| **db-auditoria** | MySQL 8.0 | Banco **exclusivo** do microsserviço (`moove_auditoria`) | `3306` apenas interno, volume `db_auditoria_data` |

## Componentes internos da API (visão resumida – C4 Nível 3)

```mermaid
flowchart LR
    subgraph HTTP["Camada HTTP"]
        R[routes/*] --> M1[middlewares: ObservabilidadeHttp, Autenticacao, Autorizar, Multer]
        M1 --> C[controllers/*]
    end
    subgraph Dominio["Camada de Serviço / Domínio"]
        S[service/*<br/>Rota, Empresa, Motorista, Passageiro...]
        E[service/whatsapp/EscalaService<br/>RegistroService]
    end
    subgraph Infra["Infraestrutura"]
        DS[(TypeORM DataSource)]
        CA[infra/cache/CacheService]
        EB[infra/eventos/EventBus + Assinantes]
        LG[infra/logger/Logger]
        RS[infra/resiliencia]
    end
    BOT[bot/WhatsAppController<br/>Baileys + node-cron] --> E
    C --> S
    C --> E
    S --> CA --> RD[(Redis)]
    S --> EB --> RD
    S --> DS --> DB[(MySQL)]
    E --> DS
    C -.erros.-> ERR[MiddlewareErro]
```

## Decisões relacionadas

- [ADR 0001 – Monólito modular em vez de microsserviços](../adr/0001-monolito-modular.md)
- [ADR 0002 – MySQL com TypeORM](../adr/0002-mysql-com-typeorm.md)
- [ADR 0003 – Redis com cache-aside](../adr/0003-redis-cache-aside.md)
- [ADR 0004 – Redis Pub/Sub para eventos de domínio](../adr/0004-redis-pubsub-eventos.md)
- [ADR 0005 – Nginx como proxy reverso](../adr/0005-nginx-proxy-reverso.md)
- [ADR 0008 – Microsserviço de Auditoria](../adr/0008-microsservico-de-auditoria.md)
