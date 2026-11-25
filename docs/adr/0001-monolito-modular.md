# ADR-0001: Monólito modular em vez de microsserviços

- **Status:** Aceita. Complementada pela [ADR-0008](0008-microsservico-de-auditoria.md), que extrai a Auditoria como microsserviço satélite
- **Data:** 2026-04-21
- **Decisores:** Equipe Moove

## Contexto e problema

O Moove precisa de uma API REST para o app, de um bot de WhatsApp que lê reações e comandos, de jobs agendados (geração da escala) e de regras de negócio fortemente acopladas entre si: fila de joinhas → escala → atribuição de rotas → passageiros.
A equipe é pequena (1 a 3 pessoas), existe uma única sessão de WhatsApp e há uma única operação (cliente). O volume é baixo: dezenas de motoristas e centenas de passageiros.

## Opções consideradas

1. **Microsserviços** (ex.: serviço de cadastros, serviço de escala, serviço de bot, serviço de notificações)
2. **Monólito tradicional** (sem fronteiras internas)
3. **Monólito modular**: um único deployable, com módulos separados por responsabilidade (routes → controllers → services → models, `service/whatsapp`, `infra/*`)

## Decisão

**Opção 3 – Monólito modular.**

| Critério | Microsserviços | Monólito modular |
|---|---|---|
| Custo operacional (deploy, observabilidade, rede) | Alto | Baixo (1 container de aplicação) |
| Consistência das regras de escala | Transações distribuídas / sagas | Transação local no MySQL |
| Sessão única do WhatsApp | Exigiria um serviço dono da sessão + mensageria obrigatória | Natural |
| Tamanho da equipe | Exige times por serviço | Adequado |
| Evolução futura | — | Os módulos seguem os *bounded contexts* e podem ser extraídos depois |

## Consequências

- ✅ Deploy, debug e testes simples. Uma transação cobre a fila e a escala.
- ✅ Os bounded contexts estão documentados ([context-map](../02-ddd/context-map.md)), o que prepara uma eventual extração.
- ✅ Eventos de domínio no Redis Pub/Sub ([ADR 0004](0004-redis-pubsub-eventos.md)) já desacoplam reações secundárias (cache, auditoria).
- ⚠️ Escala horizontal limitada pela sessão única do WhatsApp: só uma instância pode rodar o bot.
- 🔁 **Reavaliar** se: houver mais de uma operação/cliente (multi-tenant), mais de 3 equipes, ou se o bot precisar escalar separado da API. O primeiro candidato à extração é o **Contexto de Comunicação (bot)**.
