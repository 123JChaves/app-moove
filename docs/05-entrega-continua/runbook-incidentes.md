# Runbook de Incidentes – "O que fazer se o sistema cair"

> Guia curto para quem estiver de plantão. Siga na ordem: **Detectar → Classificar → Comunicar → Mitigar → Resolver → Aprender**.
> Comandos executados na pasta do projeto no servidor (`/opt/app-moove`).

## 0. Classificação de severidade

| SEV | Critério | Tempo de resposta | Exemplo |
|---|---|---|---|
| **SEV-1** | Sistema todo fora ou risco de perda de dados | Imediato (≤ 15 min) | API 502, MySQL corrompido |
| **SEV-2** | Função crítica do negócio comprometida | ≤ 30 min | Escala não gerada, WhatsApp desconectado |
| **SEV-3** | Degradação sem impacto funcional | Próximo dia útil | Redis fora (sistema mais lento), latência alta |

**Comunicação:** abra um item **Incidente** no Jira (projeto SCRUM – "Meu espaço Scrum") e avise o grupo de administradores: *"Incidente SEV-X em andamento: <sintoma>. Próxima atualização em 30 min."*

## 1. Triagem rápida (2 minutos)

```bash
docker compose ps                                  # algum container "unhealthy"/"exited"?
curl -s http://localhost/health/ready | jq         # status de mysql / redis / whatsapp
docker compose logs --since 15m backend | grep -E '"nivel":"(error|fatal)"' | tail -20
docker compose logs --since 15m nginx | grep '"status":5' | tail -20
df -h && free -m                                   # disco e memória
```

| Sintoma | Vá para |
|---|---|
| App mostra erro de conexão / Nginx 502 ou 504 | §2 |
| `redis: DOWN` | §3 |
| `whatsapp: DESCONECTADO` por mais de 5 min / bot não responde no grupo | §4 |
| Escala não foi publicada às 20:25 | §5 |
| `mysql: DOWN` | §6 |
| Problema começou logo após um deploy | §7 |
| `/auditoria/*` com 502/503 ou DLQ crescendo | §9 |

## 2. API fora (Nginx 502/504) – SEV-1
1. `docker compose ps backend`. Se estiver `exited` ou reiniciando em loop:
   `docker compose logs --tail 100 backend` e procure `"Falha crítica na inicialização"`.
2. Causas comuns:
   - **Variável de ambiente faltando** → compare `.env` com `.env.example`.
   - **MySQL indisponível** → §6.
   - **Erro de código após deploy** → §7 (rollback).
3. Reinício controlado: `docker compose restart backend` e acompanhe com `docker compose logs -f backend`.
4. Se o Nginx estiver fora: `docker compose exec nginx nginx -t` (sintaxe) e depois `docker compose restart nginx`.

## 3. Redis fora – SEV-3
O sistema **continua funcionando** (sem cache e sem eventos). Não é emergência.
```bash
docker compose logs --tail 50 redis
docker compose restart redis
docker compose exec redis redis-cli ping            # PONG
```
Depois de voltar, a API reconecta sozinha (log `Redis conectado`). Para garantir dados frescos:
`docker compose exec redis redis-cli --scan --pattern 'moove:*' | xargs -r docker compose exec -T redis redis-cli del`

## 4. WhatsApp desconectado – SEV-2
1. Logs: `docker compose logs --since 30m backend | grep -iE "whatsapp|baileys|connection"`.
2. Se for **queda de rede**: o Baileys reconecta sozinho. Aguarde 2 min.
3. Se for **sessão inválida / logout** (`loggedOut`, código 401):
   1. Avise no grupo que a escala será feita manualmente pelo app.
   2. Faça backup da pasta de sessão: `cp -r whatsappBot/sessao_whatsapp_socket backups/sessao-$(date +%F-%H%M)`.
   3. Esvazie a pasta de sessão e reinicie o back-end: `docker compose restart backend`.
   4. Leia o QR Code: `docker compose logs -f backend` e escaneie com o celular do número do bot (WhatsApp → Aparelhos conectados).
4. **Nunca** rode duas instâncias do back-end com a mesma sessão ([ADR 0006](../adr/0006-estrategia-de-deploy.md)).

## 5. Escala não gerada no horário – SEV-2
1. Confira se o cron rodou: `docker compose logs --since 1h backend | grep -i escala`.
2. Gere manualmente pelo app (tela de escala/plantões, ação de refazer a escala) ou pela API:
   ```bash
   curl -X POST http://localhost/whatsapp/escala/refazer -H "Content-Type: application/json" \
        -d '{"dia": <DIA_DE_HOJE>, "enviarWhats": true}'
   ```
3. Se der 404 *"Nenhuma lista de joinhas"*, a mensagem do dia não recebeu reações (ou não foi criada). Verifique o `@instrucao` no grupo e use `@add`/inserção manual.
4. Confirme o log `📋 Auditoria: escala gerada/refeita`.

## 6. MySQL fora – SEV-1
```bash
docker compose logs --tail 100 db
docker compose restart db          # aguarde "healthy"
docker compose restart backend
```
- **Disco cheio** (`No space left on device`): `docker system df`, limpe logs e imagens antigas (`docker image prune -a`). **Não** use `docker system prune --volumes`: isso apaga o volume `db_data`.
- **Dados corrompidos:** restaure o último backup:
  `docker compose exec -T db sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' < backups/<arquivo>.sql`

## 7. Problema após deploy – rollback
```bash
cat .versao-backend .versao-auditoria  # versões atuais
docker images moove-backend moove-auditoria   # versões disponíveis
./scripts/rollback.sh <sha_anterior> backend    # ou: auditoria
curl -s http://localhost/health/ready
```
Se a nova versão aplicou migration incompatível, restaure o backup gerado no deploy (§6) **depois** do rollback do código.

## 8. Pós-incidente (até 48 h)
Preencha o post-mortem **sem culpados** no Jira (item do tipo Incidente):
- Linha do tempo (detecção, mitigação, resolução) e o `idRequisicao` envolvido
- Impacto (usuários/motoristas afetados, consumo de error budget)
- Causa raiz (5 porquês)
- Ações preventivas, criadas como itens do backlog com responsável e prazo

## 9. Microsserviço de auditoria fora – SEV-3
O núcleo (escala, rotas, bot) **não é afetado**. Não é emergência.
```bash
docker compose ps auditoria db-auditoria
curl -s http://localhost/auditoria/health/ready | jq      # mysqlAuditoria / redis / dlqPendentes
docker compose logs --tail 100 auditoria | grep -E '"nivel":"(error|fatal)"'
```
| Situação | Ação |
|---|---|
| Container `auditoria` parado/reiniciando | `docker compose up -d auditoria`. Se for erro de versão: `./scripts/rollback.sh <sha> auditoria` |
| `mysqlAuditoria: DOWN` | `docker compose restart db-auditoria`. Os eventos ficam na DLQ e são reprocessados sozinhos (ou `POST /auditoria/dlq/reprocessar`) |
| `dlqPendentes` alto e banco UP | Verifique nos logs o motivo (`☠️ Evento enviado para a DLQ`) e reprocesse |
| Lacuna no histórico | Eventos publicados enquanto o serviço estava fora **não são recuperáveis** (Pub/Sub at-most-once). Registre no post-mortem; a evolução para Redis Streams é o item SCRUM-51 |

## Contatos
| Papel | Responsável | Contato |
|---|---|---|
| Plantão técnico | _(preencher)_ | _(WhatsApp)_ |
| Product Owner / operação | _(preencher)_ | _(WhatsApp)_ |
