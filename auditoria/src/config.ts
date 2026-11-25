import "dotenv/config";

/** Configuração 12-factor: tudo vem de variáveis de ambiente. */
export const config = {
    porta: Number(process.env.PORT || 8090),
    ambiente: process.env.NODE_ENV || "development",
    jwtSecret: process.env.JWT_SECRET || "",
    exigirJwt: process.env.AUDITORIA_EXIGIR_JWT !== "false",
    redisHabilitado: process.env.REDIS_ENABLED !== "false",
    padraoCanais: process.env.AUDITORIA_CANAIS || "moove.*",
    retencaoDias: Number(process.env.AUDITORIA_RETENCAO_DIAS || 180),
    intervaloDlqMs: Number(process.env.AUDITORIA_INTERVALO_DLQ_MS || 60_000),
    banco: {
        host: process.env.AUDITORIA_DB_HOST || "localhost",
        port: Number(process.env.AUDITORIA_DB_PORT || 3306),
        user: process.env.AUDITORIA_DB_USER || "auditoria",
        password: process.env.AUDITORIA_DB_PASSWORD || "",
        database: process.env.AUDITORIA_DB_NAME || "moove_auditoria",
    },
    redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: Number(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD || undefined,
    },
};
