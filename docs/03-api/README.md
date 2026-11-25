# API – Contrato OpenAPI

| Serviço | Contrato |
|---|---|
| Monólito (API + bot) | [`openapi.yaml`](openapi.yaml) (OpenAPI 3.0.3) |
| Microsserviço de Auditoria | [`auditoria-openapi.yaml`](auditoria-openapi.yaml) |

## Como visualizar (Swagger UI)

**Opção 1 – Docker (recomendado):**
```bash
docker run --rm -p 8088:8080 -e SWAGGER_JSON=/api/openapi.yaml -v "${PWD}/docs/03-api:/api" swaggerapi/swagger-ui
# abrir http://localhost:8088
```

**Opção 2 – Online:** cole o conteúdo do arquivo em https://editor.swagger.io

**Opção 3 – VS Code:** extensão *OpenAPI (Swagger) Editor* (42Crunch).

## Convenções da API

| Tema | Regra |
|---|---|
| Autenticação | `POST /login` → JWT em `Authorization: Bearer <token>` |
| Autorização | RBAC: `autenticar` + `autorizar(PermissoesDoSistema.X)` em cada rota |
| Erros | `{ "message": "...", "idRequisicao": "uuid" }`. Os status vêm das classes `ApiErro` (400 `RequisicaoInvalida`, 404 `NaoEncontrado`), 503 para dependência fora, 500 genérico |
| Correlation ID | Header `X-Request-Id` (gerado pelo Nginx/API se ausente) |
| Datas | Query `data=AAAA-MM-DD`; body `DD/MM/AAAA` em rotas legadas do WhatsApp |
| Cache | Listagens de rotas/empresas/motoristas passam pelo Redis; escritas invalidam |
| Saúde | `/health` (liveness), `/health/ready` (readiness), `/metrics` (Prometheus) |

## Débitos conhecidos (backlog)

- **SCRUM-42:** as rotas `/whatsapp/*` são protegidas apenas pelo Nginx; adicionar `autenticar` + permissão `USUARIO_GERENCIAR_ESCALA`.
- **SCRUM-43:** `POST /whatsapp/escala/rota-manual` está registrado duas vezes em `RotasWhatsApp.ts` e só a primeira definição é executada pelo Express; unificar.
- **SCRUM-46:** padronizar os verbos (ex.: `/empresa` → `/empresas`, `DELETE /delete/:id`) em uma versão `/v2`.
