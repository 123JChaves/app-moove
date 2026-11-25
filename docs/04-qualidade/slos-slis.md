# SLOs e SLIs

> **SLI** (*Service Level Indicator*) é o que medimos. **SLO** (*Service Level Objective*) é a meta interna para essa medida. O **Error budget** é quanto de falha a meta permite antes de congelarmos novas features e priorizarmos estabilidade.
> Janela de avaliação: **30 dias corridos**. Fontes: `GET /metrics` (API), logs JSON do Nginx e da API.

## Jornadas críticas

1. Administrador consulta e ajusta a escala/rotas no app.
2. A escala do dia é gerada e publicada no grupo no horário.
3. Motoristas e passageiros interagem com o bot.

## Tabela de SLOs

| ID | Jornada | SLI (como medir) | SLO | Error budget (30 d) |
|---|---|---|---|---|
| **SLO-01** | Disponibilidade da API | `requisições não 5xx / total`, excluindo `/health` e `/metrics`. Fonte: `moove_http_requisicoes_total{status}` | **99,5%** | ~3h36min ou 0,5% das requisições |
| **SLO-02** | Latência de leitura (listagens cacheadas: `/rotas`, `/rotas/turno/:tipo`, `/empresas`, `/motoristas`) | p95 de `moove_http_duracao_ms` | **p95 < 300 ms** | 5% das requisições acima |
| **SLO-03** | Latência de escrita (POST/PUT/DELETE de cadastros) | p95 de `moove_http_duracao_ms{metodo!="GET"}` | **p95 < 800 ms** | — |
| **SLO-04** | Escala gerada no horário | Dias com evento `moove.escala.gerada` ou log do cron de 20:25 concluído **até 20:30** / dias do mês | **≥ 99%** (no máx. 1 dia de atraso por trimestre) | 0,3 dia/mês |
| **SLO-05** | Bot conectado | Minutos com `/health/ready → whatsapp: UP` / minutos totais | **99%** | ~7h12min |
| **SLO-06** | Eficiência do cache | `hit / (hit + miss)` de `moove_cache_total` | **≥ 80%** | — (indicador de saúde, não contratual) |
| **SLO-07** | Microsserviço de Auditoria – completude | `auditoria_eventos_total{resultado=~"registrado\|duplicado"}` / `moove_eventos_publicados_total{resultado="ok"}` | **≥ 99%** dos eventos publicados auditados | 1% |
| **SLO-08** | Microsserviço de Auditoria – disponibilidade da consulta | não 5xx em `/auditoria/*` | **99%** (menos crítico que o núcleo) | ~7h12min |

### Por que esses números?
- **99,5% e não 99,9%:** a arquitetura tem instância única e deploy *recreate* ([ADR 0006](../adr/0006-estrategia-de-deploy.md)). 99,9% (43 min/mês) não é realista sem redundância.
- **300 ms:** é o limite de percepção de "resposta imediata" no app. Sem cache, as consultas de rotas com 4 JOINs passam disso em horário de pico.
- **SLO-04 é o mais importante para o negócio:** escala atrasada significa motoristas sem saber se trabalham.

## Alertas (baseados em SLO)

| Alerta | Condição | Severidade | Ação |
|---|---|---|---|
| Queima rápida do budget | Taxa de 5xx > 5% por 5 min | **SEV-1** | [Runbook §2](../05-entrega-continua/runbook-incidentes.md) |
| Latência degradada | p95 leitura > 300 ms por 15 min | SEV-3 | Verificar Redis (taxa de HIT) e MySQL |
| Escala não publicada | 20:35 sem evento `moove.escala.gerada` / log de sucesso | **SEV-2** | [Runbook §5](../05-entrega-continua/runbook-incidentes.md) |
| WhatsApp desconectado | `whatsapp != UP` por 5 min | **SEV-2** | [Runbook §4](../05-entrega-continua/runbook-incidentes.md) |
| Redis fora | `redis: DOWN` por 5 min | SEV-3 | [Runbook §3](../05-entrega-continua/runbook-incidentes.md) (o sistema funciona degradado) |
| Auditoria fora / DLQ crescendo | `/auditoria/health/ready` ≠ 200 por 5 min ou `dlqPendentes` > 100 | SEV-3 | [Runbook §9](../05-entrega-continua/runbook-incidentes.md) |

## Política de error budget

- **Budget > 50%:** ritmo normal de entregas.
- **Budget entre 0% e 50%:** cada deploy precisa de revisão extra e fica proibido deploy entre 19:30 e 20:45.
- **Budget esgotado:** congelamento de features. A sprint seguinte prioriza itens de confiabilidade do backlog.

## Consultas de exemplo (PromQL)

```promql
# SLO-01 Disponibilidade (30d)
1 - sum(increase(moove_http_requisicoes_total{status="5xx"}[30d]))
  / sum(increase(moove_http_requisicoes_total[30d]))

# SLO-02 p95 leitura (aprox. por buckets)
histogram_quantile(0.95, sum by (le) (rate(moove_http_duracao_ms_bucket{metodo="GET"}[5m])))

# SLO-06 Hit ratio
sum(rate(moove_cache_total{resultado="hit"}[1h]))
  / sum(rate(moove_cache_total{resultado=~"hit|miss"}[1h]))
```
