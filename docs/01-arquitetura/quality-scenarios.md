# Quality Scenarios (Cenários de Atributos de Qualidade)

> Formato SEI/ATAM em seis partes: **Fonte → Estímulo → Artefato → Ambiente → Resposta → Medida da resposta**.
> Cada cenário aponta a tática arquitetural adotada e onde ela está no código.

## Resumo e prioridade

| # | Atributo | Cenário | Prioridade (negócio / risco técnico) |
|---|---|---|---|
| QS-01 | Desempenho | Listagem de rotas no app | Alta / Média |
| QS-02 | Disponibilidade | Redis cai em produção | Alta / Média |
| QS-03 | Disponibilidade | MySQL demora a subir | Alta / Baixa |
| QS-04 | Confiabilidade | Escala diária gerada no horário | **Alta / Alta** |
| QS-05 | Disponibilidade | WhatsApp desconecta | **Alta / Alta** |
| QS-06 | Segurança | Acesso direto e sem permissão | Alta / Média |
| QS-07 | Observabilidade | Diagnóstico de erro reportado | Média / Baixa |
| QS-08 | Implantabilidade | Deploy com falha | Média / Média |
| QS-09 | Modificabilidade | Novo turno de rota | Média / Baixa |
| QS-10 | Disponibilidade / Isolamento | Microsserviço de auditoria cai | Média / Média |

---

### QS-01 – Desempenho: listagem de rotas
| Parte | Descrição |
|---|---|
| Fonte | Administrador no app mobile |
| Estímulo | Abre o menu "Rotas da Tarde/Madrugada" (`GET /rotas/turno/:tipo`) várias vezes por dia |
| Artefato | API (`RotaService`) + MySQL |
| Ambiente | Operação normal, ~20 usuários simultâneos |
| Resposta | Rotas retornadas do Redis (cache-aside); o MySQL só é consultado em MISS |
| **Medida** | **p95 < 300 ms** com cache quente; taxa de HIT ≥ 80% |
| Tática | Cache-aside com TTL de 120 s e invalidação em escrita ([ADR 0003](../adr/0003-redis-cache-aside.md)) |

### QS-02 – Disponibilidade: Redis indisponível
| Parte | Descrição |
|---|---|
| Fonte | Falha de infraestrutura |
| Estímulo | O container `redis` para |
| Artefato | `CacheService`, `EventBus` |
| Ambiente | Produção, horário de pico |
| Resposta | A API **continua respondendo** pelo MySQL (bypass do cache); `/health/ready` informa `DEGRADED` |
| **Medida** | 0 requisições com erro 5xx causadas pelo Redis; cada operação de cache aborta em até 300 ms |
| Tática | Degradação graciosa, `enableOfflineQueue: false`, timeout por comando ([resiliencia.md](../04-qualidade/resiliencia.md)) |

### QS-03 – Disponibilidade: MySQL lento na inicialização
| Parte | Descrição |
|---|---|
| Fonte | Docker Compose |
| Estímulo | O back-end sobe antes de o MySQL aceitar conexões |
| Artefato | `index.ts` → `AppDataSource.initialize()` |
| Resposta | Até 5 novas tentativas com backoff exponencial; se todas falharem, o processo encerra e o Docker reinicia (`restart: unless-stopped`) |
| **Medida** | Sobe sem intervenção manual em até 60 s depois que o MySQL fica saudável |
| Tática | `comRetry` + `depends_on: condition: service_healthy` |

### QS-04 – Confiabilidade: geração da escala diária
| Parte | Descrição |
|---|---|
| Fonte | Agendamento (`node-cron` às 20:25) |
| Estímulo | Hora de fechar a fila de joinhas e gerar a escala |
| Artefato | `EscalaService.gerarEscalaCompleta` |
| Resposta | Escala gerada, gravada e publicada no grupo; evento `moove.escala.gerada` registrado |
| **Medida** | Escala publicada até 20:30 em **≥ 99%** dos dias (SLO-04) |
| Tática | Regeneração manual pelo app (`POST /whatsapp/escala/refazer`), runbook (seção 5) |

### QS-05 – Disponibilidade: WhatsApp desconectado
| Parte | Descrição |
|---|---|
| Fonte | Plataforma WhatsApp |
| Estímulo | Queda da conexão WebSocket ou sessão invalidada |
| Artefato | `WhatsAppController` (Baileys) |
| Resposta | Reconexão automática; a API REST e o app continuam funcionando; as rotas `/whatsapp/*` respondem 503 enquanto o bot não está pronto |
| **Medida** | Reconexão em < 2 min (se a sessão for válida); alerta ao administrador em < 5 min |
| Tática | `VerificarBot` (503), health `whatsapp: DESCONECTADO`, [runbook](../05-entrega-continua/runbook-incidentes.md) |

### QS-06 – Segurança: acesso indevido
| Parte | Descrição |
|---|---|
| Fonte | Usuário externo ou usuário sem permissão |
| Estímulo | Abre a API direto no navegador ou chama um endpoint de escrita sem o papel necessário |
| Resposta | Nginx devolve **403** para navegação direta; a API devolve **401/403** pelo JWT + RBAC |
| **Medida** | 100% das rotas de escrita de cadastros protegidas por `autenticar` + `autorizar` |
| Tática | Nginx (bloqueio + rate limit 20 r/s), JWT, RBAC (`DicionarioRbac`) |
| Débito conhecido | As rotas `/whatsapp/*` ainda não exigem JWT. Ver backlog **SCRUM-42** |

### QS-07 – Observabilidade: diagnóstico
| Parte | Descrição |
|---|---|
| Fonte | Administrador relata "erro ao salvar rota" |
| Estímulo | Resposta 500 com `idRequisicao` no corpo |
| Resposta | Com o `idRequisicao`, o operador encontra no log JSON a linha do Nginx, a da API e o stack trace |
| **Medida** | Causa raiz localizada em **< 10 min** |
| Tática | Correlation ID (`X-Request-Id`), logs estruturados (pino + `log_format moove_json`) |

### QS-08 – Implantabilidade: deploy com defeito
| Parte | Descrição |
|---|---|
| Estímulo | Nova versão sobe, mas `/health/ready` não responde |
| Resposta | `scripts/deploy.sh` executa o rollback automático para a versão anterior |
| **Medida** | Serviço restaurado em **< 5 min** (MTTR) |

### QS-09 – Modificabilidade: novo turno
| Parte | Descrição |
|---|---|
| Estímulo | O negócio cria um turno "manhã" |
| Artefato | `Rota.tipo_rota`, `EscalaService`, telas de rotas |
| **Medida** | Implementação em ≤ 1 sprint sem alterar os contextos de Cadastro e Identidade |
| Tática | Bounded contexts separados ([context-map](../02-ddd/context-map.md)) |

### QS-10 – Isolamento de falhas: microsserviço de auditoria fora
| Parte | Descrição |
|---|---|
| Fonte | Falha de infraestrutura / deploy do microsserviço |
| Estímulo | O container `auditoria` (ou `db-auditoria`) para |
| Artefato | `moove-auditoria`, Nginx, monólito |
| Ambiente | Produção, horário de geração da escala |
| Resposta | O monólito **continua 100% funcional** (só publica eventos). O Nginx devolve 502 **apenas** em `/auditoria/*` (resolução dinâmica do upstream). Com o banco da auditoria fora, os eventos vão para a DLQ e são reprocessados quando ele volta |
| **Medida** | 0 erros nas rotas do monólito causados pela auditoria; 0 eventos perdidos com o `db-auditoria` fora por até 1 h (DLQ) |
| Tática | Comunicação só por eventos, database-per-service, DLQ + idempotência ([ADR 0008](../adr/0008-microsservico-de-auditoria.md)) |
