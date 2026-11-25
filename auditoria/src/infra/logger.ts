import pino from "pino";

/** Logs estruturados em JSON, mesmo formato do back-end principal (facilita correlacionar). */
export const logger = pino({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "test" ? "silent" : "info"),
    base: { servico: "moove-auditoria", ambiente: process.env.NODE_ENV || "development" },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: { level: (label) => ({ nivel: label }) },
});

export const criarLogger = (modulo: string) => logger.child({ modulo });
