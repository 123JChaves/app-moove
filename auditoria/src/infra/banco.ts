import mysql, { Pool } from "mysql2/promise";
import { config } from "../config";
import { comRetry, comTimeout } from "./resiliencia";
import { criarLogger } from "./logger";

const log = criarLogger("Banco");
let pool: Pool | null = null;

const DDL_EVENTO = `
CREATE TABLE IF NOT EXISTS evento_auditoria (
    id           CHAR(36)     NOT NULL PRIMARY KEY,
    tipo         VARCHAR(100) NOT NULL,
    origem       VARCHAR(120) NOT NULL,
    ocorrido_em  DATETIME(3)  NOT NULL,
    recebido_em  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    dados        JSON         NOT NULL,
    INDEX idx_evento_tipo_data (tipo, ocorrido_em),
    INDEX idx_evento_data (ocorrido_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

/** Conecta no banco PRÓPRIO do serviço (database-per-service) e aplica o esquema idempotente. */
/** Cria o database se não existir (útil rodando local no MySQL do XAMPP; no Docker ele já existe). */
async function garantirDatabase(): Promise<void> {
    const { database, ...semDatabase } = config.banco;
    try {
        const conexao = await mysql.createConnection({ ...semDatabase, connectTimeout: 5000 });
        await conexao.query(`CREATE DATABASE IF NOT EXISTS \`${database.replace(/`/g, "")}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await conexao.end();
    } catch (erro) {
        // Sem permissão de CREATE (usuário restrito no Docker) ou banco ainda subindo: segue para o retry normal
        log.debug({ erro: (erro as Error).message }, "Não foi possível garantir o database (seguindo)");
    }
}

export async function conectarBanco(): Promise<Pool> {
    await garantirDatabase();
    pool = mysql.createPool({
        ...config.banco,
        connectionLimit: 10,
        waitForConnections: true,
        connectTimeout: 5000,
        timezone: "Z",
    });
    await comRetry(() => pool!.query("SELECT 1"), { operacao: "mysql.conectar", tentativas: 10, atrasoInicialMs: 1000 });
    await pool.query(DDL_EVENTO);
    log.info({ database: config.banco.database }, "Banco de auditoria pronto");
    return pool;
}

export const obterPool = (): Pool | null => pool;

export async function bancoSaudavel(): Promise<boolean> {
    if (!pool) return false;
    try {
        await comTimeout(pool.query("SELECT 1"), 1000, "health.mysql");
        return true;
    } catch {
        return false;
    }
}

export async function fecharBanco(): Promise<void> {
    await pool?.end();
    pool = null;
}
