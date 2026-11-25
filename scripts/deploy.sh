#!/usr/bin/env bash
# =====================================================================
# DEPLOY INDEPENDENTE POR SERVIÇO - "recreate" com ROLLBACK AUTOMÁTICO
# Uso: ./scripts/deploy.sh <versao> [servico]
#   servico = backend (padrão) | auditoria
# Por que não blue/green no backend? A sessão do WhatsApp (Baileys) só pode
# ter UMA conexão ativa. Ver docs/adr/0006 e docs/adr/0008.
# =====================================================================
set -euo pipefail

VERSAO="${1:?informe a versão (SHA)}"
SERVICO="${2:-backend}"
TENTATIVAS="${TENTATIVAS:-30}"
PORTA="${NGINX_HTTP_PORT:-80}"

case "$SERVICO" in
  backend)   URL_SAUDE="http://localhost:${PORTA}/health/ready";           BANCO="db";           IMAGEM="moove-backend" ;;
  auditoria) URL_SAUDE="http://localhost:${PORTA}/auditoria/health/ready"; BANCO="db-auditoria"; IMAGEM="moove-auditoria" ;;
  *) echo "Serviço desconhecido: $SERVICO (use backend ou auditoria)"; exit 2 ;;
esac

ARQ_VERSAO=".versao-${SERVICO}"
log() { echo "[$(date -Iseconds)] [deploy:$SERVICO] $*"; }

VERSAO_ANTERIOR="$(cat "$ARQ_VERSAO" 2>/dev/null || echo "")"
log "Versão atual: ${VERSAO_ANTERIOR:-nenhuma} -> nova versão: $VERSAO"

# 1. Backup lógico do banco DO PRÓPRIO SERVIÇO
log "Gerando backup do banco ($BANCO)..."
mkdir -p backups
docker compose exec -T "$BANCO" sh -c 'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' \
  > "backups/${SERVICO}-$(date +%Y%m%d-%H%M%S)-$VERSAO.sql" || log "AVISO: backup falhou (seguindo)"

# 2. Build e recriação APENAS do serviço alvo (demais containers seguem no ar)
log "Construindo e subindo $SERVICO..."
docker compose build "$SERVICO"
docker tag "$(docker compose images -q "$SERVICO" | head -1)" "$IMAGEM:$VERSAO" || true
docker compose up -d --no-deps "$SERVICO"

# 3. Smoke test
log "Aguardando health check em $URL_SAUDE ..."
for i in $(seq 1 "$TENTATIVAS"); do
  if curl -fsS "$URL_SAUDE" >/dev/null 2>&1; then
    echo "$VERSAO" > "$ARQ_VERSAO"
    log "✅ Deploy concluído com sucesso ($VERSAO)"
    exit 0
  fi
  sleep 5
done

# 4. Rollback automático
log "❌ Health check falhou após $TENTATIVAS tentativas. Iniciando rollback..."
if [ -n "$VERSAO_ANTERIOR" ]; then
  ./scripts/rollback.sh "$VERSAO_ANTERIOR" "$SERVICO"
else
  log "Sem versão anterior registrada; rollback manual necessário (docs/05-entrega-continua/runbook-incidentes.md)"
fi
exit 1
