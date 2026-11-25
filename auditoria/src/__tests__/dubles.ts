import { randomUUID } from "crypto";
import { EventoAuditoria, FiltroEventos, PaginaEventos, ResumoPorTipo, EnvelopeEvento } from "../dtos/Evento";
import { EventoRepositorio } from "../repositorios/EventoRepositorio";
import { AssinanteRedis, FilaRedis } from "../consumidores/ConsumidorEventos";

export class RepositorioEmMemoria implements EventoRepositorio {
    eventos = new Map<string, EventoAuditoria>();
    falhar = false;

    async salvar(e: Omit<EventoAuditoria, "recebidoEm">) {
        if (this.falhar) throw new Error("ECONNREFUSED mysql");
        if (this.eventos.has(e.id)) return false;
        this.eventos.set(e.id, { ...e, recebidoEm: new Date() });
        return true;
    }
    async listar(f: FiltroEventos): Promise<PaginaEventos> {
        const todos = [...this.eventos.values()]
            .filter((e) => (!f.tipo || e.tipo === f.tipo) && (!f.de || e.ocorridoEm >= f.de) && (!f.ate || e.ocorridoEm <= f.ate))
            .sort((a, b) => b.ocorridoEm.getTime() - a.ocorridoEm.getTime());
        const inicio = (f.pagina - 1) * f.tamanho;
        return { itens: todos.slice(inicio, inicio + f.tamanho), pagina: f.pagina, tamanho: f.tamanho, total: todos.length };
    }
    async buscarPorId(id: string) { return this.eventos.get(id) ?? null; }
    async resumo(): Promise<ResumoPorTipo[]> {
        const m = new Map<string, ResumoPorTipo>();
        for (const e of this.eventos.values()) {
            const r = m.get(e.tipo) || { tipo: e.tipo, total: 0, ultimoEm: null };
            r.total++;
            if (!r.ultimoEm || e.ocorridoEm > r.ultimoEm) r.ultimoEm = e.ocorridoEm;
            m.set(e.tipo, r);
        }
        return [...m.values()];
    }
    async removerAnterioresA(d: Date) {
        let n = 0;
        for (const [id, e] of this.eventos) if (e.ocorridoEm < d) { this.eventos.delete(id); n++; }
        return n;
    }
}

export class RedisFalso implements AssinanteRedis, FilaRedis {
    listas = new Map<string, string[]>();
    private ouvintes: ((p: string, c: string, m: string) => void)[] = [];
    padroes: string[] = [];

    async psubscribe(...p: string[]) { this.padroes.push(...p); return p.length; }
    on(_e: "pmessage", f: (p: string, c: string, m: string) => void) { this.ouvintes.push(f); return this; }
    emitir(canal: string, msg: string) { this.ouvintes.forEach((f) => f("moove.*", canal, msg)); }

    async lpush(k: string, v: string) { const l = this.listas.get(k) || []; l.unshift(v); this.listas.set(k, l); return l.length; }
    async rpop(k: string) { return this.listas.get(k)?.pop() ?? null; }
    async llen(k: string) { return this.listas.get(k)?.length ?? 0; }
}

export const envelope = (tipo = "moove.rota.alterada", extra: Partial<EnvelopeEvento> = {}): EnvelopeEvento => ({
    id: randomUUID(),
    tipo,
    ocorridoEm: new Date().toISOString(),
    origem: "moove-backend:1",
    dados: { rotaId: 3, acao: "EDITADA" },
    ...extra,
});
