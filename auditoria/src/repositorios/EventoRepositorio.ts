import type { Pool, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { EventoAuditoria, FiltroEventos, PaginaEventos, ResumoPorTipo } from "../dtos/Evento";

/** Porta de persistência: o serviço depende da interface, não do MySQL (facilita testes e troca de banco). */
export interface EventoRepositorio {
    /** Retorna false se o evento (mesmo id) já existia -> idempotência. */
    salvar(evento: Omit<EventoAuditoria, "recebidoEm">): Promise<boolean>;
    listar(filtro: FiltroEventos): Promise<PaginaEventos>;
    buscarPorId(id: string): Promise<EventoAuditoria | null>;
    resumo(desde?: Date): Promise<ResumoPorTipo[]>;
    removerAnterioresA(data: Date): Promise<number>;
}

interface LinhaEvento extends RowDataPacket {
    id: string;
    tipo: string;
    origem: string;
    ocorrido_em: Date;
    recebido_em: Date;
    dados: unknown;
}

const paraEvento = (l: LinhaEvento): EventoAuditoria => ({
    id: l.id,
    tipo: l.tipo,
    origem: l.origem,
    ocorridoEm: l.ocorrido_em,
    recebidoEm: l.recebido_em,
    dados: typeof l.dados === "string" ? JSON.parse(l.dados) : l.dados,
});

/** Adaptador MySQL (consultas parametrizadas -> sem SQL injection). */
export class EventoRepositorioMySql implements EventoRepositorio {
    constructor(private readonly obterPool: () => Pool | null) {}

    private pool(): Pool {
        const p = this.obterPool();
        if (!p) throw new Error("Banco de auditoria indisponível");
        return p;
    }

    async salvar(e: Omit<EventoAuditoria, "recebidoEm">): Promise<boolean> {
        const [r] = await this.pool().execute<ResultSetHeader>(
            "INSERT IGNORE INTO evento_auditoria (id, tipo, origem, ocorrido_em, dados) VALUES (?, ?, ?, ?, ?)",
            [e.id, e.tipo, e.origem, e.ocorridoEm, JSON.stringify(e.dados ?? null)],
        );
        return r.affectedRows === 1;
    }

    async listar(f: FiltroEventos): Promise<PaginaEventos> {
        const condicoes: string[] = [];
        const params: (string | Date | number)[] = [];
        if (f.tipo) { condicoes.push("tipo = ?"); params.push(f.tipo); }
        if (f.de) { condicoes.push("ocorrido_em >= ?"); params.push(f.de); }
        if (f.ate) { condicoes.push("ocorrido_em <= ?"); params.push(f.ate); }
        const where = condicoes.length ? `WHERE ${condicoes.join(" AND ")}` : "";

        const [contagem] = await this.pool().query<RowDataPacket[]>(
            `SELECT COUNT(*) AS total FROM evento_auditoria ${where}`, params);
        const total = Number(contagem[0]?.total ?? 0);
        const [linhas] = await this.pool().query<LinhaEvento[]>(
            `SELECT * FROM evento_auditoria ${where} ORDER BY ocorrido_em DESC LIMIT ? OFFSET ?`,
            [...params, f.tamanho, (f.pagina - 1) * f.tamanho],
        );
        return { itens: linhas.map(paraEvento), pagina: f.pagina, tamanho: f.tamanho, total };
    }

    async buscarPorId(id: string): Promise<EventoAuditoria | null> {
        const [linhas] = await this.pool().query<LinhaEvento[]>("SELECT * FROM evento_auditoria WHERE id = ?", [id]);
        return linhas[0] ? paraEvento(linhas[0]) : null;
    }

    async resumo(desde?: Date): Promise<ResumoPorTipo[]> {
        const [linhas] = await this.pool().query<RowDataPacket[]>(
            `SELECT tipo, COUNT(*) AS total, MAX(ocorrido_em) AS ultimoEm FROM evento_auditoria
             ${desde ? "WHERE ocorrido_em >= ?" : ""} GROUP BY tipo ORDER BY total DESC`,
            desde ? [desde] : [],
        );
        return linhas.map((l) => ({ tipo: l.tipo, total: Number(l.total), ultimoEm: l.ultimoEm ?? null }));
    }

    async removerAnterioresA(data: Date): Promise<number> {
        const [r] = await this.pool().execute<ResultSetHeader>("DELETE FROM evento_auditoria WHERE ocorrido_em < ?", [data]);
        return r.affectedRows;
    }
}
