# ADR-0006: Deploy *recreate* com rollback automático

- **Status:** Aceita
- **Data:** 2026-11-21
- **Decisores:** Equipe Moove

## Contexto e problema

Precisamos de uma estratégia de deploy definida, com rollback. Restrição crítica: **a sessão do WhatsApp (Baileys) aceita apenas uma conexão ativa**. Se duas versões do back-end rodarem ao mesmo tempo com a mesma sessão, uma derruba a outra e há risco de corromper as chaves salvas em `sessao_whatsapp_socket/`.

## Opções consideradas

1. **Blue/Green**: duas versões completas no ar e troca no Nginx
2. **Canary / Rolling**: versões convivendo com tráfego dividido
3. **Recreate (simples) + rollback automático baseado em health check**

## Decisão

**Opção 3.** Implementada em `scripts/deploy.sh` e `scripts/rollback.sh` e chamada pelo job `deploy` do pipeline.

1. Backup do MySQL (`mysqldump`).
2. Build da nova imagem, marcada com o SHA do commit (`moove-backend:<sha>`).
3. Recria **só** o container `backend` (`db`, `redis` e `nginx` seguem no ar).
4. Smoke test em `/health/ready` (30 tentativas × 5 s).
5. Se falhar → **rollback automático** para a imagem anterior registrada em `.versao-<servico>`.

Blue/Green e Canary foram descartados por causa da sessão única. A indisponibilidade do recreate é curta (~30–60 s), aceitável dentro do error budget ([SLO-01](../04-qualidade/slos-slis.md)), e o deploy é agendado **fora das janelas críticas** (evitar 19:30–20:45, quando a fila e a escala estão sendo formadas).

## Consequências

- ✅ Simples, previsível e compatível com a sessão do WhatsApp.
- ✅ MTTR < 5 min em deploy com defeito.
- ⚠️ Downtime curto a cada deploy.
- ⚠️ Migrations destrutivas exigem a estratégia *expand/contract* para que o rollback de código continue compatível com o esquema.
- 🔁 Reavaliar Blue/Green se o bot for extraído para um serviço próprio. Aí a API REST poderá usar Blue/Green e o bot continua com recreate.
