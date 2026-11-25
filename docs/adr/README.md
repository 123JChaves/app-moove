# Architecture Decision Records (ADRs)

> Formato **MADR** (Markdown Any Decision Records). Uma ADR registra **uma** decisão significativa: o contexto, as opções avaliadas, a escolha feita e as consequências.
> ADRs aceitas são **imutáveis**. Para mudar uma decisão, crie outra ADR que a substitua.

| # | Decisão | Status | Data |
|---|---|---|---|
| [0001](0001-monolito-modular.md) | Monólito modular para o núcleo (complementada pela 0008) | Aceita | 2026-04 |
| [0002](0002-mysql-com-typeorm.md) | MySQL 8 + TypeORM como banco de dados | Aceita | 2026-04 |
| [0003](0003-redis-cache-aside.md) | Redis como cache distribuído (padrão cache-aside) | Aceita | 2026-11 |
| [0004](0004-redis-pubsub-eventos.md) | Redis Pub/Sub para eventos de domínio | Aceita | 2026-11 |
| [0005](0005-nginx-proxy-reverso.md) | Nginx como proxy reverso e ponto único de entrada | Aceita | 2026-06 |
| [0006](0006-estrategia-de-deploy.md) | Deploy *recreate* com rollback automático (não blue/green) | Aceita | 2026-11 |
| [0007](0007-integracao-whatsapp-baileys.md) | Integração com WhatsApp via Baileys | Aceita | 2026-04 |
| [0008](0008-microsservico-de-auditoria.md) | Extrair o contexto de Auditoria como microsserviço (complementa a 0001) | Aceita | 2026-11 |

## Modelo

```markdown
# ADR-XXXX: <título da decisão>

- **Status:** Proposta | Aceita | Rejeitada | Substituída por ADR-YYYY
- **Data:** AAAA-MM-DD
- **Decisores:** <nomes>

## Contexto e problema
<qual força ou restrição exige uma decisão?>

## Opções consideradas
1. ...
2. ...

## Decisão
<opção escolhida e justificativa>

## Consequências
- ✅ Positivas
- ⚠️ Negativas / riscos
- 🔁 Quando reavaliar
```
