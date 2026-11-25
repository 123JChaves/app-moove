import { config } from "./config";
import { criarApp } from "./app";
import { logger } from "./infra/logger";
import { conectarBanco, obterPool, bancoSaudavel, fecharBanco } from "./infra/banco";
import { conectarRedis, obterAssinante, obterComandos, redisSaudavel, desconectarRedis } from "./infra/redis";
import { EventoRepositorioMySql } from "./repositorios/EventoRepositorio";
import { AuditoriaService } from "./servicos/AuditoriaService";
import { ConsumidorEventos } from "./consumidores/ConsumidorEventos";

async function iniciar() {
    if (config.exigirJwt && !config.jwtSecret) throw new Error("JWT_SECRET não configurado");

    await conectarBanco();          // retry com backoff até o MySQL próprio ficar pronto
    conectarRedis();                // reconexão automática; não bloqueia o boot

    const service = new AuditoriaService(new EventoRepositorioMySql(obterPool));
    const consumidor = new ConsumidorEventos(service, obterAssinante, obterComandos, config.padraoCanais);
    void consumidor.iniciar().catch((e) => logger.error({ erro: e.message }, "Falha ao assinar eventos"));

    const app = criarApp({
        service, consumidor,
        segredoJwt: config.jwtSecret,
        exigirJwt: config.exigirJwt,
        bancoSaudavel, redisSaudavel,
    });
    const servidor = app.listen(config.porta, "0.0.0.0", () =>
        logger.info(`🧾 Serviço de auditoria ouvindo na porta ${config.porta}`));

    // Reprocessamento periódico da DLQ e política de retenção
    const jobDlq = setInterval(() => void consumidor.reprocessarDlq().catch(() => undefined), config.intervaloDlqMs);
    const retencao = async () => {
        try {
            const removidos = await service.aplicarRetencao(config.retencaoDias);
            if (removidos) logger.info({ removidos, dias: config.retencaoDias }, "Retenção aplicada");
        } catch (e) { logger.warn({ erro: (e as Error).message }, "Falha ao aplicar retenção"); }
    };
    void retencao();
    const jobRetencao = setInterval(() => void retencao(), 24 * 60 * 60 * 1000);

    const encerrar = async (sinal: string) => {
        logger.warn({ sinal }, "Encerrando serviço de auditoria...");
        clearInterval(jobDlq);
        clearInterval(jobRetencao);
        servidor.close();
        await desconectarRedis();
        await fecharBanco();
        process.exit(0);
    };
    process.on("SIGTERM", () => void encerrar("SIGTERM"));
    process.on("SIGINT", () => void encerrar("SIGINT"));
}

iniciar().catch((erro) => {
    logger.fatal({ erro: erro.message, stack: erro.stack }, "❌ Falha crítica na inicialização da auditoria");
    process.exit(1);
});
