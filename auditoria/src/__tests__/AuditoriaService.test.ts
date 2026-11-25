import { AuditoriaService } from "../servicos/AuditoriaService";
import { NaoEncontradoErro, RequisicaoInvalidaErro } from "../erros/ApiErro";
import { RepositorioEmMemoria, envelope } from "./dubles";

describe("AuditoriaService", () => {
    let repo: RepositorioEmMemoria;
    let service: AuditoriaService;

    beforeEach(() => {
        repo = new RepositorioEmMemoria();
        service = new AuditoriaService(repo);
    });

    it("registra um evento válido", async () => {
        const e = envelope();
        await expect(service.registrar(service.validarEnvelope(e))).resolves.toBe("registrado");
        expect(repo.eventos.get(e.id)?.tipo).toBe("moove.rota.alterada");
    });

    it("é idempotente: o mesmo id não é gravado duas vezes", async () => {
        const e = envelope();
        await service.registrar(e);
        await expect(service.registrar(e)).resolves.toBe("duplicado");
        expect(repo.eventos.size).toBe(1);
    });

    it("rejeita envelopes fora do contrato", () => {
        expect(() => service.validarEnvelope({ ...envelope(), id: "123" })).toThrow(RequisicaoInvalidaErro);
        expect(() => service.validarEnvelope({ ...envelope(), tipo: "outro.sistema" })).toThrow(RequisicaoInvalidaErro);
        expect(() => service.validarEnvelope({ ...envelope(), ocorridoEm: "ontem" })).toThrow(RequisicaoInvalidaErro);
        expect(() => service.validarEnvelope(null)).toThrow(RequisicaoInvalidaErro);
    });

    it("valida e normaliza o filtro de consulta (DTO de entrada)", () => {
        expect(service.montarFiltro({})).toEqual({ tipo: undefined, de: undefined, ate: undefined, pagina: 1, tamanho: 20 });
        expect(() => service.montarFiltro({ tamanho: "500" })).toThrow(RequisicaoInvalidaErro);
        expect(() => service.montarFiltro({ pagina: "0" })).toThrow(RequisicaoInvalidaErro);
        expect(() => service.montarFiltro({ de: "xx" })).toThrow(RequisicaoInvalidaErro);
        expect(() => service.montarFiltro({ de: "2026-11-21", ate: "2026-11-01" })).toThrow(RequisicaoInvalidaErro);
    });

    it("busca por id e retorna 404 quando não existe", async () => {
        const e = envelope();
        await service.registrar(e);
        await expect(service.buscar(e.id)).resolves.toMatchObject({ id: e.id });
        await expect(service.buscar("00000000-0000-4000-8000-000000000000")).rejects.toBeInstanceOf(NaoEncontradoErro);
    });

    it("aplica a política de retenção", async () => {
        await service.registrar(envelope("moove.rota.alterada", { ocorridoEm: "2020-01-01T00:00:00.000Z" }));
        await service.registrar(envelope());
        await expect(service.aplicarRetencao(180)).resolves.toBe(1);
        expect(repo.eventos.size).toBe(1);
    });
});
