import { Request, Response } from "express";
import { AuditoriaService } from "../servicos/AuditoriaService";
import { ConsumidorEventos } from "../consumidores/ConsumidorEventos";

/** Adaptação HTTP: lê a requisição, chama o service e monta a resposta. */
export class AuditoriaController {
    constructor(private readonly service: AuditoriaService, private readonly consumidor: ConsumidorEventos) {}

    listar = async (req: Request, res: Response) => {
        const filtro = this.service.montarFiltro(req.query as Record<string, unknown>);
        res.json(await this.service.listar(filtro));
    };

    buscar = async (req: Request, res: Response) => {
        res.json(await this.service.buscar(String(req.params.id)));
    };

    resumo = async (req: Request, res: Response) => {
        const dias = req.query.dias === undefined ? undefined : Number(req.query.dias);
        res.json({ dias: dias ?? null, porTipo: await this.service.resumo(dias) });
    };

    reprocessarDlq = async (_req: Request, res: Response) => {
        res.json(await this.consumidor.reprocessarDlq());
    };
}
