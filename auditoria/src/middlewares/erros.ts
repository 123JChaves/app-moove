import { NextFunction, Request, Response } from "express";
import { ApiErro } from "../erros/ApiErro";
import { criarLogger } from "../infra/logger";

const log = criarLogger("Erro");

/** Tratamento centralizado: erro de negócio -> status próprio; demais -> 500 sem vazar detalhes. */
export function tratarErros(erro: Error, req: Request, res: Response, _next: NextFunction) {
    const idRequisicao = res.locals.idRequisicao;
    if (erro instanceof ApiErro) {
        return res.status(erro.status).json({ message: erro.message, idRequisicao });
    }
    log.error({ idRequisicao, erro: erro.message, stack: erro.stack, url: req.originalUrl }, "Erro não tratado");
    return res.status(500).json({ message: "Erro interno no serviço de auditoria", idRequisicao });
}
