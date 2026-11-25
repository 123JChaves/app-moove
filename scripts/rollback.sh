#!/usr/bin/env bash
# =====================================================================
# ROLLBACK - volta um serviço para uma imagem anterior já construída
# Uso: ./scripts/rollback.sh <versao_anterior> [servico]   (backend | auditoria)
# =====================================================================
set -euo pipefail
VERSAO="${1:?informe a versão para a qual voltar}"
SERVICO="${2:-backend}"
case "$SERVICO" in
  backend)   IMAGEM="moove-backend";   URL="/health/ready" ;;
  auditoria) IMAGEM="moove-auditoria"; URL="/auditoria/health/ready" ;;
  *) echo "Serviço desconhecido: $SERVICO"; exit 2 ;;
esac
log() { echo "[$(date -Iseconds)] [rollback:$SERVICO] $*"; }

if ! docker image inspect "$IMAGEM:$VERSAO" >/dev/null 2>&1; then
  log "Imagem $IMAGEM:$VERSAO não encontrada localmente."
  log "Alternativa: git checkout $VERSAO && docker compose up -d --build $SERVICO"
  exit 1
fi

IMAGEM_COMPOSE="$(docker compose config --images | grep -i "$SERVICO" | head -1)"
docker tag "$IMAGEM:$VERSAO" "$IMAGEM_COMPOSE"
docker compose up -d --no-deps --no-build "$SERVICO"
echo "$VERSAO" > ".versao-${SERVICO}"
log "✅ Rollback para $VERSAO concluído. Verifique: curl -fsS http://localhost${URL}"
