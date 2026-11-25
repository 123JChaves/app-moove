import { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";
import { criarLogger } from "../infra/logger";
import { incrementar, observarLatencia } from "../infra/metricas";

const log = criarLogger("HTTP");

/** Correlation ID (X-Request-Id vindo do Nginx) + log por requisição + métricas RED. */
export function observabilidade(req: Request, res: Response, next: NextFunction) {
    const inicio = process.hrtime.bigint();
    const idRequisicao = (req.headers["x-request-id"] as string) || randomUUID();
    res.locals.idRequisicao = idRequisicao;
    res.setHeader("X-Request-Id", idRequisicao);

    res.on("finish", () => {
        const duracaoMs = Number(process.hrtime.bigint() - inicio) / 1e6;
        const rota = req.route?.path ? `${req.baseUrl || ""}${req.route.path}` : "nao_mapeada";
        incrementar("auditoria_http_requisicoes_total", { metodo: req.method, rota, status: `${Math.floor(res.statusCode / 100)}xx` });
        observarLatencia({ metodo: req.method, rota }, duracaoMs);
        if (rota.includes("/health") || rota.endsWith("/metrics")) return;
        const dados = { idRequisicao, metodo: req.method, url: req.originalUrl, rota, status: res.statusCode, duracaoMs: Math.round(duracaoMs) };
        if (res.statusCode >= 500) log.error(dados, "Requisição com erro no servidor");
        else if (res.statusCode >= 400) log.warn(dados, "Requisição rejeitada");
        else log.info(dados, "Requisição concluída");
    });
    next();
}
