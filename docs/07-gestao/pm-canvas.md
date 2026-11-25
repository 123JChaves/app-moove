# Project Model Canvas – Moove

> Modelo de José Finocchio Jr. Ele organiza o plano do projeto em uma única página, respondendo **Por quê? O quê? Quem? Como? Quando e quanto?**
> Campos com _(preencher)_ dependem de informações da equipe.

```
┌──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
│ JUSTIFICATIVAS       │ PRODUTO              │ STAKEHOLDERS         │ PREMISSAS            │ RISCOS               │
│ (passado)            │                      │ EXTERNOS & FATORES   │                      │                      │
│ • Escala de          │ Plataforma Moove:    │ • Empresas clientes  │ • Motoristas         │ • Bloqueio/banimento │
│   motoristas feita   │ API + bot WhatsApp + │ • Motoristas         │   continuam usando   │   do número no       │
│   à mão, a partir    │ app mobile p/ gestão │ • Passageiros        │   o grupo WhatsApp   │   WhatsApp           │
│   das reações 👍     │ de transporte de     │ • WhatsApp (Meta)    │ • Número dedicado    │ • Mudança no         │
│ • Erros e conflitos  │ funcionários         │ • Professores /      │   para o bot         │   protocolo (Baileys)│
│   na ordem da fila   │                      │   banca avaliadora   │ • 1 servidor com     │ • Regras de escala   │
│ • Sem visão de quem  ├──────────────────────┤ • LGPD (dados        │   Docker disponível  │   mal entendidas     │
│   faz cada rota      │ REQUISITOS           │   pessoais)          │ • Equipe com Node/TS │ • Atraso nas entregas│
│ • Comunicação        │ • Cadastros (mot.,   ├──────────────────────┤ • Operação aceita    │   acadêmicas         │
│   dispersa           │   pass., empresas)   │ EQUIPE               │   downtime curto em  │ • Perda de dados     │
├──────────────────────┤ • Fila de joinhas    │ • Product Owner:     │   deploy             │   (sem backup)       │
│ OBJ. SMART           │   automática         │   (preencher)        ├──────────────────────┼──────────────────────┤
│ Até 04/2027, gerar   │ • Escala: plantão,   │ • Scrum Master:      │ GRUPO DE ENTREGAS    │ LINHA DO TEMPO       │
│ 100% das escalas     │   rotas, apoio,      │   (preencher)        │ 1. Gestão (Jira,     │ Abr/26 Iniciação     │
│ diárias de forma     │   backup             │ • Dev back-end/bot   │    Canvas, Cynefin)  │ Abr–Mai Planejamento │
│ automática até 20:30,│ • Rotas tarde/madr.  │ • Dev mobile         │ 2. Cadastros + RBAC  │ Mai/26–Abr/27 Exec.  │
│ com ≤ 1 correção     │ • Solicitação de     │ • DevOps/QA          │ 3. Bot + Fila        │   (sprints 2 sem.)   │
│ manual por semana e  │   corrida            │   (preencher nomes)  │ 4. Escala + Rotas    │ Contínuo: Monitor.   │
│ API com 99,5% de     │ • App de gestão      │                      │ 5. App mobile        │ Abr/27 Encerramento  │
│ disponibilidade      │ • Disponível 99,5%,  │                      │ 6. Infra + micros-   │                      │
│                      │   p95 < 300 ms       │                      │    serviço auditoria │ Marcos: v1.1 nov/26, │
├──────────────────────┤ • Segurança (JWT,    │                      │ 7. Documentação      │ v2.0 30/abr/2027     │
│ BENEFÍCIOS (futuro)  │   RBAC, TLS)         │                      │    arquitetural      ├──────────────────────┤
│ • −90% do tempo do   │                      │                      │                      │ CUSTOS               │
│   adm. montando      │                      │                      │                      │ • Servidor VPS       │
│   escala             │                      │                      │                      │   (preencher R$/mês) │
│ • Fila justa e       │                      │                      │                      │ • Chip/número bot    │
│   auditável          │                      │                      │                      │ • Horas da equipe    │
│ • Passageiro sabe    │                      │                      │                      │ • Ferramentas: Jira, │
│   sua rota/horário   │                      │                      │                      │   GitHub (free tier) │
└──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘
```

## Detalhamento por bloco

### Por quê?
- **Justificativas:** a escala era montada manualmente contando as reações 👍 no grupo, com erros de ordem, conflitos entre motoristas e muito tempo do administrador. Não havia registro de quem fazia cada rota nem confirmação dos passageiros.
- **Objetivo SMART:** *até abril de 2027, gerar automaticamente 100% das escalas diárias até as 20:30, com no máximo 1 correção manual por semana, mantendo a API com disponibilidade ≥ 99,5% ao mês.*
- **Benefícios:** redução do tempo operacional, transparência da fila, menos conflitos, histórico auditável (eventos `moove.escala.gerada`) e base para cobrar as empresas por rota executada.

### O quê?
- **Produto:** plataforma Moove (API REST + bot de WhatsApp + app mobile administrativo).
- **Requisitos-chave:** ver o [Product Backlog](product-backlog.md). Requisitos não funcionais nos [SLOs](../04-qualidade/slos-slis.md) e nos [Quality Scenarios](../01-arquitetura/quality-scenarios.md).

### Quem?
| Papel | Responsabilidades |
|---|---|
| **Product Owner** | Prioriza o backlog e valida as regras de escala com a operação |
| **Scrum Master / Gerente de Projeto** | Remove impedimentos, conduz cerimônias, acompanha marcos, riscos e o Canvas |
| **Dev back-end / bot** | API, regras de escala, integração com o WhatsApp |
| **Dev mobile** | App Expo/React Native |
| **DevOps / QA** | Docker, CI/CD, testes E2E, observabilidade |
| **Stakeholders externos** | Empresas clientes, motoristas, passageiros, banca avaliadora |

### Como?
- **Premissas:** listadas no quadro.
- **Restrições:** prazo acadêmico, orçamento mínimo (*free tiers*), WhatsApp sem API oficial para grupos, LGPD.
- **Grupo de entregas:** 7 pacotes iniciais + a **fase final** (solicitação de corridas pelo WhatsApp e app do motorista com notificações). Cada pacote é um **Épico** no Jira (SCRUM-2 a SCRUM-11).

### Quando e quanto?
- **Riscos (com resposta):**

| Risco | Prob. | Impacto | Resposta |
|---|---|---|---|
| Banimento do número no WhatsApp | Média | Alto | **Mitigar:** número dedicado, sem spam, escala manual pelo app como contingência |
| Quebra do Baileys após atualização do WhatsApp | Média | Alto | **Mitigar:** versão fixada, monitoramento `/health/ready`, runbook |
| Regras de escala mal entendidas | Alta | Médio | **Mitigar:** sprints curtas com validação do PO, testes de regras |
| Perda de dados | Baixa | Alto | **Mitigar:** backup antes de deploy, volume dedicado |
| Atraso nas entregas acadêmicas | Média | Médio | **Aceitar/mitigar:** marcos com folga, priorização MoSCoW |

- **Linha do tempo:** ver [ciclo-de-vida.md](ciclo-de-vida.md).
- **Custos:** _(preencher valores)_ VPS, chip do bot, horas da equipe. As ferramentas usam planos gratuitos.
