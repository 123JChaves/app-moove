import request from "supertest";
import jwt from "jsonwebtoken";
import { criarApp } from "../app";
import { AuditoriaService } from "../servicos/AuditoriaService";
import { ConsumidorEventos } from "../consumidores/ConsumidorEventos";
import { RepositorioEmMemoria, RedisFalso, envelope } from "./dubles";

const SEGREDO = "segredo-de-teste";

function montar(bancoOk = true) {
    const repo = new RepositorioEmMemoria();
    const redis = new RedisFalso();
    const service = new AuditoriaService(repo);
    const consumidor = new ConsumidorEventos(service, () => redis, () => redis);
    const app = criarApp({
        service, consumidor, segredoJwt: SEGREDO,
        bancoSaudavel: async () => bancoOk,
        redisSaudavel: async () => true,
    });
    return { app, service };
}

const token = jwt.sign({ id: 1, email: "admin@moove.com" }, SEGREDO, { expiresIn: "1h" });

describe("API REST da auditoria", () => {
    it("health e readiness", async () => {
        const { app } = montar();
        await request(app).get("/auditoria/health").expect(200);
        const r = await request(app).get("/auditoria/health/ready").expect(200);
        expect(r.body.status).toBe("UP");
        await request(montar(false).app).get("/auditoria/health/ready").expect(503);
    });

    it("exige JWT nas rotas de negócio", async () => {
        const { app } = montar();
        await request(app).get("/auditoria/eventos").expect(401);
        await request(app).get("/auditoria/eventos").set("Authorization", "Bearer token-falso").expect(401);
    });

    it("lista eventos paginados e filtra por tipo", async () => {
        const { app, service } = montar();
        await service.registrar(envelope("moove.rota.alterada"));
        await service.registrar(envelope("moove.escala.gerada"));

        const r = await request(app).get("/auditoria/eventos?tipo=moove.escala.gerada&tamanho=10")
            .set("Authorization", `Bearer ${token}`).expect(200);
        expect(r.body.total).toBe(1);
        expect(r.body.itens[0].tipo).toBe("moove.escala.gerada");
    });

    it("erros retornam a mensagem e o idRequisicao", async () => {
        const { app } = montar();
        const r = await request(app).get("/auditoria/eventos?tamanho=999")
            .set("Authorization", `Bearer ${token}`).set("X-Request-Id", "req-123").expect(400);
        expect(r.body).toMatchObject({ idRequisicao: "req-123" });
        await request(app).get("/auditoria/eventos/00000000-0000-4000-8000-000000000000")
            .set("Authorization", `Bearer ${token}`).expect(404);
    });

    it("resumo por tipo e métricas", async () => {
        const { app, service } = montar();
        await service.registrar(envelope());
        const r = await request(app).get("/auditoria/resumo").set("Authorization", `Bearer ${token}`).expect(200);
        expect(r.body.porTipo[0]).toMatchObject({ tipo: "moove.rota.alterada", total: 1 });
        const m = await request(app).get("/auditoria/metrics").expect(200);
        expect(m.text).toContain("auditoria_http_requisicoes_total");
    });
});
