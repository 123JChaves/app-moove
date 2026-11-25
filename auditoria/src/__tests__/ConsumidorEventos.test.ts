import { AuditoriaService } from "../servicos/AuditoriaService";
import { ConsumidorEventos, CHAVE_DLQ } from "../consumidores/ConsumidorEventos";
import { RepositorioEmMemoria, RedisFalso, envelope } from "./dubles";

describe("ConsumidorEventos (Redis Pub/Sub)", () => {
    let repo: RepositorioEmMemoria;
    let redis: RedisFalso;
    let consumidor: ConsumidorEventos;

    beforeEach(() => {
        repo = new RepositorioEmMemoria();
        redis = new RedisFalso();
        consumidor = new ConsumidorEventos(new AuditoriaService(repo), () => redis, () => redis, "moove.*", 2);
    });

    it("assina o padrão moove.* e grava os eventos recebidos", async () => {
        await consumidor.iniciar();
        expect(redis.padroes).toEqual(["moove.*"]);

        const e = envelope("moove.escala.gerada", { dados: { listaJoiaId: 9 } });
        redis.emitir("moove.escala.gerada", JSON.stringify(e));
        await new Promise((r) => setTimeout(r, 10));

        expect(repo.eventos.get(e.id)?.dados).toEqual({ listaJoiaId: 9 });
    });

    it("descarta mensagens malformadas sem derrubar o consumidor", async () => {
        await expect(consumidor.processar("moove.x", "{nao-e-json")).resolves.toBe("invalido");
        await expect(consumidor.processar("moove.x", JSON.stringify({ id: "1" }))).resolves.toBe("invalido");
        expect(await redis.llen(CHAVE_DLQ)).toBe(0);
    });

    it("banco fora: tenta de novo e envia para a DLQ; depois reprocessa", async () => {
        repo.falhar = true;
        const e = envelope();
        await expect(consumidor.processar(e.tipo, JSON.stringify(e))).resolves.toBe("dlq");
        expect(await redis.llen(CHAVE_DLQ)).toBe(1);

        repo.falhar = false;
        await expect(consumidor.reprocessarDlq()).resolves.toEqual({ reprocessados: 1, pendentes: 0 });
        expect(repo.eventos.has(e.id)).toBe(true);
    });
});
