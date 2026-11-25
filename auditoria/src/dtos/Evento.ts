/** Envelope publicado pelo back-end principal (Published Language, ver docs/06-backend-avancado/mensageria-pubsub.md). */
export interface EnvelopeEvento<T = unknown> {
    id: string;
    tipo: string;
    ocorridoEm: string;
    origem: string;
    dados: T;
}

/** Registro persistido no banco de auditoria. */
export interface EventoAuditoria {
    id: string;
    tipo: string;
    origem: string;
    ocorridoEm: Date;
    recebidoEm: Date;
    dados: unknown;
}

/** DTO de entrada da consulta (já validado). */
export interface FiltroEventos {
    tipo?: string;
    de?: Date;
    ate?: Date;
    pagina: number;
    tamanho: number;
}

/** DTO de saída paginada. */
export interface PaginaEventos {
    itens: EventoAuditoria[];
    pagina: number;
    tamanho: number;
    total: number;
}

export interface ResumoPorTipo {
    tipo: string;
    total: number;
    ultimoEm: Date | null;
}

export type ResultadoRegistro = "registrado" | "duplicado";
