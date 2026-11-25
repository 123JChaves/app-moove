-- Esquema do banco PRÓPRIO do microsserviço de auditoria (database-per-service).
-- Aplicado automaticamente e de forma idempotente no boot (src/infra/banco.ts).
CREATE TABLE IF NOT EXISTS evento_auditoria (
    id           CHAR(36)     NOT NULL PRIMARY KEY,      -- id do envelope (uuid) -> garante idempotência
    tipo         VARCHAR(100) NOT NULL,                  -- canal, ex.: moove.rota.alterada
    origem       VARCHAR(120) NOT NULL,                  -- instância que publicou
    ocorrido_em  DATETIME(3)  NOT NULL,                  -- quando o fato aconteceu (UTC)
    recebido_em  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    dados        JSON         NOT NULL,                  -- payload do evento
    INDEX idx_evento_tipo_data (tipo, ocorrido_em),
    INDEX idx_evento_data (ocorrido_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
