import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { NaoAutorizadoErro } from "../erros/ApiErro";

/**
 * Valida o JWT emitido pelo back-end principal (POST /login) usando o mesmo JWT_SECRET.
 * Validação STATELESS: o microsserviço não consulta o banco do monólito.
 */
export function criarAutenticacao(segredo: string, obrigatorio = true) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!obrigatorio) return next();
        const [esquema, token] = (req.headers.authorization || "").split(" ");
        if (esquema !== "Bearer" || !token || !segredo) return next(new NaoAutorizadoErro());
        try {
            const payload = jwt.verify(token, segredo) as { id?: number; email?: string };
            res.locals.usuario = { id: payload.id, email: payload.email };
            return next();
        } catch {
            return next(new NaoAutorizadoErro("Token inválido ou expirado."));
        }
    };
}
