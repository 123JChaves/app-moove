# ADR-0007: Integração com WhatsApp via Baileys

- **Status:** Aceita
- **Data:** 2026-04-21
- **Decisores:** Equipe Moove

## Contexto e problema

A operação já acontece em **grupos de WhatsApp**: motoristas reagem com 👍 para entrar na fila e passageiros pedem corrida. O sistema precisa **ler reações em grupos** e **publicar mensagens nesses grupos**.

## Opções consideradas

1. **WhatsApp Business Cloud API (oficial)**: não suporta leitura de grupos nem reações em grupos da forma necessária, e cobra por conversa.
2. **whatsapp-web.js** (Puppeteer): pesado (Chromium headless), alto consumo de memória.
3. **Baileys** (`@whiskeysockets/baileys`): conexão WebSocket direta com o protocolo do WhatsApp Web, leve, suporta grupos e reações.

## Decisão

**Baileys**, isolado em `bot/WhatsAppController.ts`, que funciona como **camada anticorrupção** (ACL): traduz eventos do WhatsApp (JID/LID, reações) em comandos do domínio (`RegistroService`, `EscalaService`).

## Consequências

- ✅ Atende a leitura de grupos e reações, com baixo consumo de recursos.
- ⚠️ **Biblioteca não oficial**: pode quebrar quando o WhatsApp mudar o protocolo, e existe risco de banimento do número.
  - Mitigações: versão fixada no `package.json`, sessão persistida em volume, health check `whatsapp`, runbook de reconexão, número dedicado.
- ⚠️ Exige instância única ([ADR 0006](0006-estrategia-de-deploy.md)).
- 🔁 Reavaliar a API oficial se ela passar a suportar grupos ou se o risco de banimento aumentar.
