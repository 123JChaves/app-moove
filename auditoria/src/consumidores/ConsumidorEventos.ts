import { AuditoriaService } from "../servicos/AuditoriaService";
import { ApiErro } from "../erros/ApiErro";
import { comRetry } from "../infra/resiliencia";
import { criarLogger } from "../infra/logger";
import { incrementar } from "../infra/metricas";

const log = criarLogger("Consumidor");

export const CHAVE_DLQ = "moove:auditoria:dlq";

export interface AssinanteRedis {
    psubscribe(...padroes: string[]): Promise<unknown>;
    on(evento: "pmessage", ouvinte: (padrao: string, canal: string, mensagem: string) => void): unknown;
}

export interface FilaRedis {
    lpush(chave: string, valor: string): Promise<number>;
    rpop(chave: string): Promise<string | null>;
    llen(chave: string): Promise<number>;
}

export type ResultadoProcessamento = "registrado" | "duplicado" | "invalido" | "dlq";

/**
 * Assinante dos eventos de domínio do Moove (Redis Pub/Sub, padrão "moove.*").
 * - Valida o envelope e grava no banco de auditoria (idempotente pelo id).
 * - Falha de banco -> retry com backoff; se persistir -> Dead Letter Queue (lista Redis),
 *   reprocessada periodicamente. Mensagem malformada -> descartada com log (não adianta repetir).
 */
export class ConsumidorEventos {
    constructor(
        private readonly service: AuditoriaService,
        private readonly obterAssinante: () => AssinanteRedis | null,
        private readonly obterFila: () => FilaRedis | null,
        private readonly padrao = "moove.*",
        private readonly tentativas = 3,
    ) {}

    async iniciar(): Promise<void> {
        const assinante = this.obterAssinante();
        if (!assinante) {
            log.warn("Assinante Redis não configurado; consumo de eventos desativado");
            return;
        }
        assinante.on("pmessage", (_padrao, canal, mensagem) => { void this.processar(canal, mensagem); });
        await assinante.psubscribe(this.padrao);
        log.info({ padrao: this.padrao }, "📡 Inscrito nos eventos de domínio");
    }

    async processar(canal: string, mensagem: string): Promise<ResultadoProcessamento> {
        let bruto: unknown;
        try {
            bruto = JSON.parse(mensagem);
        } catch {
            incrementar("auditoria_eventos_total", { canal, resultado: "invalido" });
            log.error({ canal, mensagem: mensagem.slice(0, 200) }, "Mensagem descartada: JSON malformado");
            return "invalido";
        }

        let envelope;
        try {
            envelope = this.service.validarEnvelope(bruto);
        } catch (erro) {
            incrementar("auditoria_eventos_total", { canal, resultado: "invalido" });
            log.error({ canal, erro: (erro as Error).message }, "Mensagem descartada: envelope inválido");
            return "invalido";
        }
        if (envelope.tipo !== canal) log.warn({ canal, tipo: envelope.tipo }, "Tipo do envelope difere do canal");

        try {
            const resultado = await comRetry(() => this.service.registrar(envelope), {
                operacao: "auditoria.registrar",
                tentativas: this.tentativas,
                atrasoInicialMs: 200,
                deveRetentar: (e) => !(e instanceof ApiErro),
            });
            incrementar("auditoria_eventos_total", { canal, resultado });
            log.info({ canal, eventoId: envelope.id, origem: envelope.origem, resultado }, "📥 Evento AUDITADO");
            return resultado;
        } catch (erro) {
            await this.enviarParaDlq(canal, mensagem, erro);
            return "dlq";
        }
    }

    private async enviarParaDlq(canal: string, mensagem: string, erro: unknown) {
        incrementar("auditoria_eventos_total", { canal, resultado: "dlq" });
        const fila = this.obterFila();
        const registro = JSON.stringify({ canal, mensagem, erro: (erro as Error)?.message, em: new Date().toISOString() });
        if (!fila) {
            log.error({ canal, erro: (erro as Error)?.message }, "❌ Evento PERDIDO: banco e Redis indisponíveis");
            return;
        }
        try {
            await fila.lpush(CHAVE_DLQ, registro);
            log.error({ canal, erro: (erro as Error)?.message }, "☠️ Evento enviado para a DLQ");
        } catch (e) {
            log.error({ canal, erro: (e as Error).message }, "❌ Evento PERDIDO: falha ao gravar na DLQ");
        }
    }

    /** Reprocessa até o tamanho atual da DLQ (itens que falharem de novo voltam para ela). */
    async reprocessarDlq(): Promise<{ reprocessados: number; pendentes: number }> {
        const fila = this.obterFila();
        if (!fila) return { reprocessados: 0, pendentes: 0 };
        const quantidade = await fila.llen(CHAVE_DLQ);
        let reprocessados = 0;
        for (let i = 0; i < quantidade; i++) {
            const item = await fila.rpop(CHAVE_DLQ);
            if (!item) break;
            const { canal, mensagem } = JSON.parse(item) as { canal: string; mensagem: string };
            const resultado = await this.processar(canal, mensagem);
            if (resultado === "registrado" || resultado === "duplicado") reprocessados++;
        }
        const pendentes = await fila.llen(CHAVE_DLQ);
        if (quantidade > 0) log.info({ reprocessados, pendentes }, "DLQ reprocessada");
        return { reprocessados, pendentes };
    }

    async tamanhoDlq(): Promise<number | null> {
        const fila = this.obterFila();
        if (!fila) return null;
        try {
            return await fila.llen(CHAVE_DLQ);
        } catch {
            return null;
        }
    }
}
