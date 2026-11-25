import { criarLogger } from "./logger";

const log = criarLogger("Resiliencia");

export class TimeoutErro extends Error {
    constructor(operacao: string, ms: number) {
        super(`Timeout de ${ms}ms excedido em "${operacao}"`);
        this.name = "TimeoutErro";
    }
}

export async function comTimeout<T>(promessa: Promise<T>, ms: number, operacao: string): Promise<T> {
    let t: NodeJS.Timeout | undefined;
    const limite = new Promise<never>((_, rej) => { t = setTimeout(() => rej(new TimeoutErro(operacao, ms)), ms); });
    try {
        return await Promise.race([promessa, limite]);
    } finally {
        if (t) clearTimeout(t);
    }
}

export interface OpcoesRetry {
    operacao: string;
    tentativas?: number;
    atrasoInicialMs?: number;
    atrasoMaximoMs?: number;
    deveRetentar?: (erro: unknown) => boolean;
}

/** Retry com backoff exponencial + jitter (somente para operações idempotentes). */
export async function comRetry<T>(fn: () => Promise<T>, o: OpcoesRetry): Promise<T> {
    const { operacao, tentativas = 3, atrasoInicialMs = 200, atrasoMaximoMs = 5000, deveRetentar = () => true } = o;
    let ultimo: unknown;
    for (let i = 1; i <= tentativas; i++) {
        try {
            return await fn();
        } catch (erro) {
            ultimo = erro;
            if (i === tentativas || !deveRetentar(erro)) break;
            const base = Math.min(atrasoInicialMs * 2 ** (i - 1), atrasoMaximoMs);
            const atraso = Math.round(base / 2 + Math.random() * (base / 2));
            log.warn({ operacao, tentativa: i, proximaEmMs: atraso, erro: (erro as Error)?.message }, "Falha transitória, nova tentativa agendada");
            await new Promise((r) => setTimeout(r, atraso));
        }
    }
    throw ultimo;
}
