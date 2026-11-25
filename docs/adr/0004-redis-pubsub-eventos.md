# ADR-0004: Redis Pub/Sub para eventos de domínio

- **Status:** Aceita
- **Data:** 2026-11-21
- **Decisores:** Equipe Moove

## Contexto e problema

Algumas ações de negócio geram **efeitos colaterais** que não devem ficar acoplados ao fluxo principal:

- uma rota alterada precisa invalidar o cache **em todas as instâncias** da API;
- a geração da escala precisa ficar registrada para auditoria;
- no futuro, notificações push e relatórios vão reagir aos mesmos fatos.

## Opções consideradas

1. Chamadas diretas entre services (acoplamento)
2. **Redis Pub/Sub** (já temos Redis)
3. Redis Streams (com persistência e grupos de consumidores)
4. RabbitMQ / Kafka

## Decisão

**Redis Pub/Sub**, encapsulado em `infra/eventos/EventBus.ts`, com handlers em `infra/eventos/Assinantes.ts`.

Canais publicados:

| Canal | Publicado por | Consumidores |
|---|---|---|
| `moove.rota.alterada` | `RotaService` (criar/editar/excluir) | invalida `rotas:*` + log |
| `moove.empresa.alterada` | `EmpresaService` | invalida `empresas:*` e `rotas:*` |
| `moove.motorista.alterado` | `MotoristaService` | invalida `motoristas:*` |
| `moove.passageiro.alterado` | `PassageiroService` | invalida `rotas:*` |
| `moove.escala.gerada` | `POST /whatsapp/gerar-escala`, `/whatsapp/escala/refazer` | log de auditoria |

Envelope padrão: `{ id (uuid), tipo, ocorridoEm (ISO), origem, dados }`.

**Justificativa:** usamos infraestrutura que já existe (Redis), com latência sub-milissegundo, e o caso de uso é *broadcast* de notificações idempotentes. RabbitMQ/Kafka seriam exagero para o volume atual.

## Consequências

- ✅ Desacoplamento: o service só publica o fato, e quem precisa reage.
- ✅ Escala horizontal da API com cache consistente.
- ✅ Logs `📤 Evento PUBLICADO` / `📥 Evento RECEBIDO` comprovam a circulação das mensagens.
- ⚠️ Pub/Sub é *fire-and-forget*: se ninguém estiver inscrito ou o Redis estiver fora, **o evento se perde**. Por isso:
  - cada service **também** invalida o próprio cache de forma síncrona;
  - nenhum evento hoje carrega uma obrigação de negócio que não possa ser perdida.
- 🔁 **Reavaliar → Redis Streams** quando houver consumidores que exijam entrega garantida (ex.: notificação push de escala ao motorista).
