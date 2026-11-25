# ADR-0003: Redis como cache distribuído com padrão cache-aside

- **Status:** Aceita
- **Data:** 2026-11-21
- **Decisores:** Equipe Moove

## Contexto e problema

As telas do app (menus de rotas da tarde/madrugada, lista de empresas, lista de motoristas) disparam consultas com **vários JOINs** (rota → passageiros → endereço → bairro, rota ↔ empresas). Esses dados **mudam pouco** e são **lidos muitas vezes**. Um cache em memória do processo (Map) não sobrevive a reinícios e não é compartilhado entre instâncias.

## Opções consideradas

1. Sem cache
2. Cache em memória do processo (`Map` / `node-cache`)
3. **Redis** com **cache-aside** (lazy loading)
4. Redis com *write-through* (gravar no cache a cada escrita)

## Decisão

**Redis 7 com cache-aside, TTL e invalidação explícita em escritas.** Implementação em `whatsappBot/src/infra/cache/CacheService.ts`.

| Dado | Chave | TTL padrão | Invalidado por |
|---|---|---|---|
| Todas as rotas | `moove:rotas:todas` | 120 s (`CACHE_TTL_ROTAS`) | criar/editar/excluir rota, passageiro ou empresa |
| Rotas por turno | `moove:rotas:turno:{tipo}` | 120 s | idem |
| Rota por id | `moove:rotas:id:{id}` | 120 s | idem |
| Empresas | `moove:empresas:todas`, `moove:empresas:id:{id}` | 600 s | criar/editar/excluir empresa |
| Motoristas | `moove:motoristas:todos` | 60 s | criar/editar/ativar/inativar/excluir/vincular LID |

- **Por que cache-aside:** só guarda o que é realmente lido e tolera a queda do Redis (a aplicação sempre sabe buscar no banco).
- **Por que não write-through:** as escritas montam objetos com relações (passageiros, empresas). Regravar o objeto completo no cache a cada escrita duplicaria regras. Invalidar é mais simples e seguro.
- **TTL** é a rede de segurança contra escritas que não passam pelos services (ex.: atualizações feitas diretamente pelo bot).
- **Invalidação por prefixo** usa `SCAN` (nunca `KEYS`, que bloqueia o Redis).
- **Dados que NÃO são cacheados:** a fila de joinhas e a escala do dia. Eles mudam a cada reação no WhatsApp e precisam de consistência imediata.

## Consequências

- ✅ Menos carga no MySQL e menor latência (meta p95 < 300 ms, [SLO-02](../04-qualidade/slos-slis.md)).
- ✅ Degradação graciosa: sem Redis, o modo *bypass* responde direto do banco.
- ⚠️ Pode haver dados desatualizados por até 1 TTL se alguém alterar o banco por fora dos services.
- ⚠️ Mais um container para operar (healthcheck, memória limitada a 128 MB com política `allkeys-lru`).
