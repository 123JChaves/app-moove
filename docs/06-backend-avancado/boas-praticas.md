# Boas práticas e observabilidade no back-end

## Organização do código (`whatsappBot/src`)

```
src/
├── index.ts                 # composição da aplicação (bootstrap, middlewares, rotas, shutdown)
├── data-source.ts           # TypeORM (MySQL)
├── routes/                  # mapeamento HTTP -> controller (+ autenticação/autorização)
├── controllers/             # adaptação HTTP: lê req, chama service, monta res
├── service/                 # regras de negócio (um service por agregado)
│   └── whatsapp/            # regras do core: EscalaService, RegistroService
├── models/                  # entidades TypeORM
├── interfaces/              # DTOs / contratos de entrada e saída (IMotorista, IEmpresa...)
├── middlewares/             # Autenticacao, Autorizar, VerificarBot, Multer,
│                            # ObservabilidadeHttp, MiddlewareErro
├── error/                   # ApiErro, NaoEncontrado (404), RequisicaoInvalida (400)
├── utils/                   # validators (CPF, CNPJ, e-mail), helpers, formatters, RBAC
├── bot/                     # WhatsAppController (camada anticorrupção com o Baileys)
├── migrations/              # evolução versionada do esquema
├── infra/                   # infraestrutura transversal
│   ├── redis/               # conexões ioredis (comandos + subscriber)
│   ├── cache/               # CacheService (cache-aside)
│   ├── eventos/             # EventBus (Pub/Sub) + Assinantes
│   ├── logger/              # pino (JSON)
│   ├── observabilidade/     # métricas Prometheus
│   └── resiliencia/         # retry, timeout, circuit breaker
└── __tests__/               # testes unitários (Jest)
```

O microsserviço [`auditoria/`](../../auditoria/README.md) segue a mesma organização (`controllers → servicos → repositorios`, `dtos`, `middlewares`, `infra`), com o repositório definido como **interface (porta)** e o MySQL como adaptador.

**Fluxo de dependência:** `routes → controllers → services → (models | infra)`. Controllers não acessam o repositório e services não conhecem `req`/`res`.

## Práticas adotadas

| Prática | Evidência |
|---|---|
| **DTOs / interfaces** para entrada e saída | `interfaces/I*.ts`, tipos nos services (`IMotorista`, `IEmpresa`...) |
| **Validação no domínio** | `VerificarCamposObrigatorios`, `VerificarDuplicidade`, validators de CPF/CNPJ/e-mail, `TextoHelper.sanitizarNome` |
| **Erros tipados + tratamento centralizado** | Hierarquia `ApiErro` → `MiddlewareErro` responde `{ message, idRequisicao }` sem vazar stack trace |
| **Segurança** | bcrypt, JWT, RBAC (`DicionarioRbac` + seed), Nginx com bloqueio e rate limit, `.env` fora do Git (`.env.example` versionado) |
| **Configuração por ambiente** | `dotenv`, variáveis no compose (12-factor) |
| **Logs estruturados** | `infra/logger/Logger.ts` (pino, JSON) com `criarLogger("Modulo")` |
| **Rastreabilidade** | `ObservabilidadeHttp` (correlation ID + log por requisição + métricas) |
| **Health / métricas** | `/health`, `/health/ready`, `/metrics` |
| **Testes** | Jest (unitários de cache, eventos e resiliência) + E2E do app (`jcha_app/e2e`) + Husky pre-push |
| **Padronização de commits** | Conventional Commits validados por Husky |
| **Migrations versionadas** | `src/migrations/*` |

## Logs claros para identificar fluxos

Toda requisição gera uma linha como:
```json
{"time":"2026-11-21T23:10:04.530Z","nivel":"info","servico":"moove-backend","modulo":"HTTP","idRequisicao":"7f3c9a...","metodo":"GET","url":"/rotas/turno/ROTA_TARDE","rota":"/rotas/turno/:tipo","status":200,"duracaoMs":4,"usuarioId":1,"msg":"Requisição concluída"}
```

Filtros úteis:
```bash
docker compose logs backend | grep '"idRequisicao":"7f3c9a'      # um fluxo ponta a ponta
docker compose logs backend | grep '"nivel":"error"'             # só erros
docker compose logs backend | grep '"modulo":"Cache"'            # comportamento do cache
```

## Débitos técnicos identificados (no backlog)

| ID | Débito | Risco |
|---|---|---|
| SCRUM-42 | Rotas `/whatsapp/*` sem JWT (só Nginx) | Segurança |
| SCRUM-43 | `POST /whatsapp/escala/rota-manual` registrada duas vezes; a segunda nunca é executada | Manutenção |
| SCRUM-44 | `synchronize: true` no `data-source.ts` | Alteração de esquema involuntária em produção |
| SCRUM-45 | Value Objects como primitivos | Regras de validação espalhadas |
| SCRUM-48 | Vários `console.log` legados no `WhatsAppController`/`EscalaService` | Logs não estruturados; migrar para `criarLogger` |
| SCRUM-49 | Rotas `/whatsapp/*` acessam repositórios direto (lógica no arquivo de rotas) | Testabilidade; extrair para `EscalaService`/controllers |
