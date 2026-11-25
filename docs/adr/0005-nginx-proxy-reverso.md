# ADR-0005: Nginx como proxy reverso e ponto único de entrada

- **Status:** Aceita
- **Data:** 2026-06-25
- **Decisores:** Equipe Moove

## Contexto e problema

A API Node não deve ser exposta diretamente: ela precisa de TLS, proteção contra abuso, bloqueio de curiosos acessando o JSON pelo navegador e suporte a WebSocket. O MySQL e o Redis não podem ficar acessíveis pela internet.

## Opções consideradas

1. Expor o Express direto (porta 8085)
2. **Nginx** como proxy reverso
3. Traefik / Caddy

## Decisão

**Nginx (`nginx:alpine`)** como único container com portas publicadas. `backend`, `db` e `redis` usam `expose` (somente rede interna `app_network`).

Responsabilidades configuradas em `nginx/nginx.conf`:

- terminação TLS (`nginx/certs`, TLS 1.2/1.3) e HTTP na porta 80;
- `upstream moove_backend` com `keepalive` e `max_fails` (pronto para mais instâncias);
- **rate limit** de 20 req/s por IP (rajada de 40) → `429`;
- **bloqueio de navegação direta** (`Sec-Fetch-Mode: navigate`) → `403`;
- upgrade de **WebSocket**;
- **Correlation ID**: repassa ou gera `X-Request-Id`;
- cabeçalhos de segurança (`nosniff`, `X-Frame-Options`, `Referrer-Policy`);
- logs de acesso em **JSON**;
- `/health` público e `/metrics` restrito à rede interna.

## Consequências

- ✅ Superfície de ataque reduzida e configuração de borda centralizada.
- ✅ Sintaxe validada no pipeline (`nginx -t`).
- ⚠️ Certificado local (mkcert) é só para desenvolvimento. Em produção, usar Let's Encrypt.
- 🔁 Reavaliar Traefik se houver muitos serviços com descoberta dinâmica.
