import { EnvelopeEvento, FiltroEventos, PaginaEventos, ResultadoRegistro, ResumoPorTipo, EventoAuditoria } from "../dtos/Evento";
import { EventoRepositorio } from "../repositorios/EventoRepositorio";
import { NaoEncontradoErro, RequisicaoInvalidaErro } from "../erros/ApiErro";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIPO = /^moove\.[a-z0-9_.-]+$/i;
const TAMANHO_MAXIMO = 100;

/** Regras de negócio do contexto de Auditoria. */
export class AuditoriaService {
    constructor(private readonly repositorio: EventoRepositorio) {}

    /** Valida o contrato do envelope (anti-corrupção: não confia cegamente no publicador). */
    validarEnvelope(bruto: unknown): EnvelopeEvento {
        const e = bruto as Partial<EnvelopeEvento>;
        if (!e || typeof e !== "object") throw new RequisicaoInvalidaErro("Envelope de evento ausente");
        if (typeof e.id !== "string" || !UUID.test(e.id)) throw new RequisicaoInvalidaErro("Envelope sem id (uuid) válido");
        if (typeof e.tipo !== "string" || !TIPO.test(e.tipo)) throw new RequisicaoInvalidaErro("Tipo de evento inválido");
        if (typeof e.ocorridoEm !== "string" || isNaN(Date.parse(e.ocorridoEm))) throw new RequisicaoInvalidaErro("Data ocorridoEm inválida");
        if (typeof e.origem !== "string" || !e.origem) throw new RequisicaoInvalidaErro("Origem do evento ausente");
        return { id: e.id, tipo: e.tipo, ocorridoEm: e.ocorridoEm, origem: e.origem.slice(0, 120), dados: e.dados ?? null };
    }

    /** Registra o evento de forma IDEMPOTENTE (o mesmo id não é gravado duas vezes). */
    async registrar(envelope: EnvelopeEvento): Promise<ResultadoRegistro> {
        const inserido = await this.repositorio.salvar({
            id: envelope.id,
            tipo: envelope.tipo,
            origem: envelope.origem,
            ocorridoEm: new Date(envelope.ocorridoEm),
            dados: envelope.dados,
        });
        return inserido ? "registrado" : "duplicado";
    }

    /** Converte a query string em um filtro válido (DTO de entrada). */
    montarFiltro(q: Record<string, unknown>): FiltroEventos {
        const pagina = q.pagina === undefined ? 1 : Number(q.pagina);
        const tamanho = q.tamanho === undefined ? 20 : Number(q.tamanho);
        if (!Number.isInteger(pagina) || pagina < 1) throw new RequisicaoInvalidaErro("'pagina' deve ser inteiro >= 1");
        if (!Number.isInteger(tamanho) || tamanho < 1 || tamanho > TAMANHO_MAXIMO)
            throw new RequisicaoInvalidaErro(`'tamanho' deve ser inteiro entre 1 e ${TAMANHO_MAXIMO}`);

        const data = (nome: string): Date | undefined => {
            if (q[nome] === undefined || q[nome] === "") return undefined;
            const d = new Date(String(q[nome]));
            if (isNaN(d.getTime())) throw new RequisicaoInvalidaErro(`'${nome}' deve ser uma data ISO-8601 (ex.: 2026-11-21)`);
            return d;
        };
        const de = data("de");
        const ate = data("ate");
        if (de && ate && de > ate) throw new RequisicaoInvalidaErro("'de' não pode ser posterior a 'ate'");

        const tipo = q.tipo ? String(q.tipo) : undefined;
        if (tipo && !TIPO.test(tipo)) throw new RequisicaoInvalidaErro("'tipo' inválido (ex.: moove.rota.alterada)");
        return { tipo, de, ate, pagina, tamanho };
    }

    listar(filtro: FiltroEventos): Promise<PaginaEventos> {
        return this.repositorio.listar(filtro);
    }

    async buscar(id: string): Promise<EventoAuditoria> {
        if (!UUID.test(id)) throw new RequisicaoInvalidaErro("Id deve ser um uuid");
        const evento = await this.repositorio.buscarPorId(id);
        if (!evento) throw new NaoEncontradoErro("Evento não encontrado na auditoria");
        return evento;
    }

    resumo(dias?: number): Promise<ResumoPorTipo[]> {
        if (dias !== undefined && (!Number.isInteger(dias) || dias < 1)) throw new RequisicaoInvalidaErro("'dias' deve ser inteiro >= 1");
        return this.repositorio.resumo(dias ? new Date(Date.now() - dias * 86_400_000) : undefined);
    }

    /** Política de retenção (LGPD: não guardar dados além do necessário). */
    aplicarRetencao(dias: number): Promise<number> {
        return this.repositorio.removerAnterioresA(new Date(Date.now() - dias * 86_400_000));
    }
}
