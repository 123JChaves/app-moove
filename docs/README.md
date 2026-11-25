# 📚 Documentação do Moove (app-moove)

> **Formato:** *Docs-as-Code*. Toda a documentação fica versionada no mesmo repositório do código, em Markdown, e é revisada em Pull Request junto com as mudanças que a motivam.
> **Estrutura:** baseada no **arc42** (template de documentação arquitetural), com diagramas **C4 Model** em Mermaid (renderizados nativamente pelo GitHub), decisões registradas como **ADRs** (formato MADR) e contrato de API em **OpenAPI 3**.

## Por que este formato?

| Critério | Docs-as-Code (arc42 + C4 + ADR + OpenAPI) | Wiki / Word / PDF solto |
|---|---|---|
| Fica desatualizada? | Muda no mesmo PR do código: revisão obrigatória | Esquecida após a entrega |
| Diagramas | Texto (Mermaid/DSL) → diff, histórico, sem ferramenta paga | Imagens binárias difíceis de manter |
| Decisões | ADR imutável explica **por que** algo foi feito | Conhecimento se perde com as pessoas |
| API | OpenAPI gera Swagger UI, clientes e testes de contrato | Lista manual de endpoints |
| Avaliação | Cada item da rubrica aponta para um arquivo verificável | Difícil de rastrear |

---

## 🗺️ Mapa da documentação × rubrica

### Arquitetura de Software

| Item da rubrica | Entrega | Onde |
|---|---|---|
| **Documentação Arquitetural** | Diagrama C4 – Contexto | [01-arquitetura/c4-nivel1-contexto.md](01-arquitetura/c4-nivel1-contexto.md) |
| | Diagrama C4 – Containers | [01-arquitetura/c4-nivel2-containers.md](01-arquitetura/c4-nivel2-containers.md) |
| | Modelo C4 como código (Structurizr DSL) | [01-arquitetura/workspace.dsl](01-arquitetura/workspace.dsl) |
| | Registro de ADRs (monólito modular × microsserviços etc.) | [adr/](adr/README.md) |
| | **Microsserviço de Auditoria** (extração justificada) | [adr/0008](adr/0008-microsservico-de-auditoria.md) · [doc](06-backend-avancado/microsservico-auditoria.md) · código em [`auditoria/`](../auditoria/README.md) |
| | Quality Scenarios (desempenho, disponibilidade...) | [01-arquitetura/quality-scenarios.md](01-arquitetura/quality-scenarios.md) |
| **Estilos Arquiteturais e DDD** | Subdomínios + Context Map | [02-ddd/context-map.md](02-ddd/context-map.md) |
| | Bounded Contexts (Escala, Rotas, Cadastros...) | [02-ddd/context-map.md](02-ddd/context-map.md#3-bounded-contexts) |
| | Entities, Value Objects e Aggregates | [02-ddd/modelo-de-dominio.md](02-ddd/modelo-de-dominio.md) |
| **Integração, APIs e Dados** | Arquivo OpenAPI/Swagger | [03-api/openapi.yaml](03-api/openapi.yaml) (monólito) · [03-api/auditoria-openapi.yaml](03-api/auditoria-openapi.yaml) (microsserviço) · [guia](03-api/README.md) |
| | ADR do banco de dados | [adr/0002-mysql-com-typeorm.md](adr/0002-mysql-com-typeorm.md) |
| **Qualidade, Resiliência e Observabilidade** | SLOs / SLIs | [04-qualidade/slos-slis.md](04-qualidade/slos-slis.md) |
| | Estratégias de resiliência (retry, timeout, circuit breaker) | [04-qualidade/resiliencia.md](04-qualidade/resiliencia.md) |
| | Plano de observabilidade (métricas e logs) | [04-qualidade/observabilidade.md](04-qualidade/observabilidade.md) |
| **Entrega Contínua** | Pipeline CI/CD (build, test, deploy) | [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml) · [doc](05-entrega-continua/pipeline-ci-cd.md) |
| | Estratégia de deploy (recreate + rollback) | [05-entrega-continua/estrategia-de-deploy.md](05-entrega-continua/estrategia-de-deploy.md) · [ADR 0006](adr/0006-estrategia-de-deploy.md) |
| | Runbook de incidentes | [05-entrega-continua/runbook-incidentes.md](05-entrega-continua/runbook-incidentes.md) |

### Back-end Avançado

| Item da rubrica | Evidência no código | Documentação |
|---|---|---|
| **Cache distribuído com Redis** (cache-aside, TTL, invalidação) | `whatsappBot/src/infra/cache/CacheService.ts`, uso em `RotaService`, `EmpresaService`, `MotoristaService` | [06-backend-avancado/cache-redis.md](06-backend-avancado/cache-redis.md) |
| **Mensageria / Pub/Sub** (publicar, consumir, logs) | Publicação: `whatsappBot/src/infra/eventos/EventBus.ts`. Consumo: `Assinantes.ts` (monólito) e `auditoria/src/consumidores/ConsumidorEventos.ts` (**microsserviço**) | [06-backend-avancado/mensageria-pubsub.md](06-backend-avancado/mensageria-pubsub.md) |
| **Docker Compose + Nginx** | `docker-compose.yml` (db, redis, backend, **db-auditoria, auditoria**, nginx, frontend), `nginx/nginx.conf` (roteia `/` → monólito e `/auditoria/` → microsserviço) | [06-backend-avancado/docker-e-nginx.md](06-backend-avancado/docker-e-nginx.md) |
| **Boas práticas e observabilidade** | módulos, DTOs/interfaces, services, controllers, logs JSON, `MiddlewareErro` | [06-backend-avancado/boas-praticas.md](06-backend-avancado/boas-praticas.md) |

### Tech Forge (Gestão de Projetos)

| Item da rubrica | Onde |
|---|---|
| **Gestão do trabalho via Jira** | [Board no Jira](https://jchabapst.atlassian.net/jira/software/projects/SCRUM/boards/2) (projeto `SCRUM`: 10 épicos, 60 itens, 15 sprints, 7 releases) · [07-gestao/jira.md](07-gestao/jira.md) |
| **Cynefin e escolha da abordagem** | [07-gestao/cynefin.md](07-gestao/cynefin.md) |
| **Ciclo de vida (preditivo) + PM Canvas** | [07-gestao/ciclo-de-vida.md](07-gestao/ciclo-de-vida.md) · [07-gestao/pm-canvas.md](07-gestao/pm-canvas.md) |
| **Product Backlog / User Stories / Releases** | [07-gestao/product-backlog.md](07-gestao/product-backlog.md) · [CHANGELOG](../CHANGELOG.md) |

---

## Convenções

- **Idioma:** português, termos técnicos consagrados em inglês.
- **Diagramas:** Mermaid dentro do Markdown. No VS Code, instale a extensão *Markdown Preview Mermaid Support*.
- **ADRs:** nunca editar uma ADR aceita. Para mudar a decisão, crie outra com o status `Substitui ADR-000X`.
- **Commits de documentação:** `docs: <descrição>` (validado pelo Husky em `validar-commit.js`).
