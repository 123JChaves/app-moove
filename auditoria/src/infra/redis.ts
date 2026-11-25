import Redis from "ioredis";
import { config } from "../config";
import { criarLogger } from "./logger";

const log = criarLogger("Redis");

let comandos: Redis | null = null;   // LPUSH/RPOP da DLQ, PING
let assinante: Redis | null = null;  // conexão dedicada ao PSUBSCRIBE

function eventos(c: Redis, nome: string) {
    c.on("ready", () => log.info({ conexao: nome }, "Redis conectado"));
    c.on("error", (e) => log.warn({ conexao: nome, erro: e.message }, "Erro na conexão Redis"));
    c.on("reconnecting", (ms: number) => log.warn({ conexao: nome, emMs: ms }, "Reconectando ao Redis"));
}

export function conectarRedis(): void {
    if (!config.redisHabilitado) {
        log.warn("Redis desabilitado (REDIS_ENABLED=false): o consumo de eventos fica desligado; a API de consulta funciona normalmente");
        return;
    }
    const base = {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        connectTimeout: 2000,
        retryStrategy: (t: number) => Math.min(t * 200, 5000),
    };
    // Comandos: falha rápida (não segura requisições se o Redis cair)
    comandos = new Redis({ ...base, commandTimeout: 1000, maxRetriesPerRequest: 1, enableOfflineQueue: false });
    // Assinante: fila offline ligada -> o PSUBSCRIBE é executado assim que conectar
    // e o ioredis refaz a assinatura sozinho após quedas (autoResubscribe).
    assinante = new Redis({ ...base, enableOfflineQueue: true, maxRetriesPerRequest: null });
    eventos(comandos, "comandos");
    eventos(assinante, "assinante");
}

export const obterComandos = (): Redis | null => (comandos && comandos.status === "ready" ? comandos : null);
export const obterAssinante = (): Redis | null => assinante;

export async function redisSaudavel(): Promise<boolean> {
    const c = obterComandos();
    if (!c) return false;
    try {
        return (await c.ping()) === "PONG";
    } catch {
        return false;
    }
}

export async function desconectarRedis(): Promise<void> {
    await Promise.allSettled([comandos?.quit(), assinante?.quit()]);
}
