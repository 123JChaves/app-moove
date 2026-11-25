import express, { Router } from "express";
import { AuditoriaService } from "./servicos/AuditoriaService";
import { ConsumidorEventos } from "./consumidores/ConsumidorEventos";
import { AuditoriaController } from "./controllers/AuditoriaController";
import { observabilidade } from "./middlewares/observabilidade";
import { criarAutenticacao } from "./middlewares/autenticacao";
import { tratarErros } from "./middlewares/erros";
import { renderizarPrometheus } from "./infra/metricas";
import { NaoEncontradoErro } from "./erros/ApiErro";

export interface DependenciasApp {
    service: AuditoriaService;
    consumidor: ConsumidorEventos;
    segredoJwt: string;
    exigirJwt?: boolean;
    bancoSaudavel: () => Promise<boolean>;
    redisSaudavel: () => Promise<boolean>;
}

/** Fábrica do app (injeção de dependências -> testável sem MySQL/Redis reais). */
export function criarApp(d: DependenciasApp) {
    const app = express();
    app.disable("x-powered-by");
    app.use(observabilidade);
    app.use(express.json({ limit: "100kb" }));

    const controller = new AuditoriaController(d.service, d.consumidor);
    const autenticar = criarAutenticacao(d.segredoJwt, d.exigirJwt ?? true);
    const r = Router();

    // ---- Operação (sem autenticação) ----
    r.get("/health", (_req, res) => { res.json({ status: "UP", uptimeSegundos: Math.round(process.uptime()) }); });
    r.get("/health/ready", async (_req, res) => {
        const [banco, redis, dlq] = await Promise.all([d.bancoSaudavel(), d.redisSaudavel(), d.consumidor.tamanhoDlq()]);
        const status = !banco ? "DOWN" : !redis ? "DEGRADED" : "UP";
        res.status(banco ? 200 : 503).json({
            status,
            dependencias: { mysqlAuditoria: banco ? "UP" : "DOWN", redis: redis ? "UP" : "DOWN" },
            dlqPendentes: dlq,
            verificadoEm: new Date().toISOString(),
        });
    });
    r.get("/metrics", (_req, res) => { res.type("text/plain; version=0.0.4").send(renderizarPrometheus()); });

    // ---- API de negócio (JWT) ----
    r.get("/eventos", autenticar, controller.listar);
    r.get("/eventos/:id", autenticar, controller.buscar);
    r.get("/resumo", autenticar, controller.resumo);
    r.post("/dlq/reprocessar", autenticar, controller.reprocessarDlq);

    app.use("/auditoria", r);
    app.use((req, _res, next) => next(new NaoEncontradoErro(`Rota ${req.method} ${req.path} não existe no serviço de auditoria`)));
    app.use(tratarErros);
    return app;
}
