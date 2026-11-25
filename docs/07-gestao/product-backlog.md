# Product Backlog – Moove

> Fonte única: este arquivo e o [CSV de importação do Jira](jira-importacao.csv) são gerados do mesmo conjunto de itens.
> Priorização **MoSCoW** (Must, Should, Could, Won't) · Estimativa em **story points** (Fibonacci) · Releases conforme o [CHANGELOG](../../CHANGELOG.md).

## Épicos

| ID | Épico | Release | Status |
|---|---|---|---|
| SCRUM-2 | **Cadastros de parceiros** – Cadastro e manutenção de motoristas, passageiros, empresas e endereços. | v0.1.0 | Done |
| SCRUM-3 | **Fila de joinhas e escala** – Formação automática da fila pelo WhatsApp e geração da escala diária (core). | v1.0.0 | Done |
| SCRUM-4 | **Rotas e atribuições** – Rotas da tarde/madrugada, ordem de embarque, atribuição de motoristas e solicitações de corrida. | v1.0.0 | Done |
| SCRUM-5 | **Bot WhatsApp** – Comandos, notificações e integração Baileys. | v0.5.0 | Done |
| SCRUM-6 | **App mobile de gestão** – Telas Expo/React Native para o administrador. | v1.0.0 | Done |
| SCRUM-7 | **Segurança e acesso** – Login JWT, RBAC, proteção de borda. | v1.0.1 | Done |
| SCRUM-8 | **Infra, performance e observabilidade** – Docker, Nginx, Redis, CI/CD, logs, métricas e resiliência. | v1.1.0 | In Progress |
| SCRUM-9 | **Documentação e gestão** – C4, ADRs, DDD, OpenAPI, SLOs, runbook, Cynefin, PM Canvas. | v1.1.0 | In Progress |

## Ordem de prioridade (próximas sprints)

1. SCRUM-42 (segurança) → 2. SCRUM-44 (dados) → 3. SCRUM-43 (bug) → 4. SCRUM-47 / SCRUM-48 (resiliência e logs) → 5. SCRUM-50 (dashboards) → 6. SCRUM-49 → 7. SCRUM-45, SCRUM-46, SCRUM-51


## SCRUM-2 · Cadastros de parceiros

### SCRUM-12 – Cadastrar motorista  
`Story` · **Must** · 3 SP · v0.1.0 · _Done_ · labels: `cadastros`, `backend`

> Como administrador, quero cadastrar motoristas com nome e WhatsApp, para que possam entrar na fila do dia.

**Critérios de aceite**
- [x] Dado nome e telefone válidos, Quando salvo, Então o motorista é criado ativo
- [x] Dado um LID já usado, Quando salvo, Então recebo 400 de duplicidade
- [x] O nome é salvo sanitizado

### SCRUM-13 – Cadastrar empresa com logo  
`Story` · **Must** · 5 SP · v0.1.0 · _Done_ · labels: `cadastros`, `backend`

> Como administrador, quero cadastrar empresas com CNPJ e logo, para identificar os clientes atendidos nas rotas.

**Critérios de aceite**
- [x] Dado CNPJ inválido, Então recebo 400
- [x] Dado CNPJ duplicado, Então recebo 400
- [x] A logo é enviada via multipart e servida em /imagens

### SCRUM-14 – Cadastrar passageiro com endereço  
`Story` · **Must** · 5 SP · v0.1.0 · _Done_ · labels: `cadastros`, `backend`

> Como administrador, quero cadastrar passageiros vinculados a uma empresa e um endereço, para incluí-los em rotas.

**Critérios de aceite**
- [x] Endereço/bairro inexistente é criado automaticamente (buscar ou criar)
- [x] Telefone é normalizado para dígitos
- [x] Telefone duplicado retorna 400

### SCRUM-15 – Ativar/inativar motorista  
`Story` · **Should** · 2 SP · v1.0.0 · _Done_ · labels: `cadastros`

> Como administrador, quero inativar um motorista, para que ele não entre na fila sem ser excluído.

**Critérios de aceite**
- [x] PATCH /motoristas/:id/status altera o campo ativo
- [x] Motorista inativo não é aceito na fila
- [x] Comandos @ativar/@inativar no grupo têm o mesmo efeito


## SCRUM-3 · Fila de joinhas e escala

### SCRUM-17 – Gerar escala automática às 20:25  
`Story` · **Must** · 13 SP · v1.0.0 · _Done_ · labels: `escala`, `backend`

> Como administrador, quero que a escala seja gerada automaticamente, para não montar a lista à mão.

**Critérios de aceite**
- [x] Às 20:25 o cron gera a escala da lista do dia
- [x] Categorias plantão, rota, apoio e backup seguem a meta do dia
- [x] A escala é publicada no grupo
- [x] Evento moove.escala.gerada registrado

### SCRUM-18 – Configurar dia livre (feriado)  
`Story` · **Should** · 3 SP · v1.0.0 · _Done_ · labels: `escala`

> Como administrador, quero marcar um dia como livre, para que a escala use a regra reduzida.

**Critérios de aceite**
- [x] POST /whatsapp/configurar-dia com tipo DIA_LIVRE
- [x] Em dia livre só há plantão e o restante fica LIVRE
- [x] O grupo recebe aviso

### SCRUM-19 – Penalizar motorista  
`Story` · **Should** · 5 SP · v1.0.1 · _Done_ · labels: `escala`

> Como administrador, quero penalizar um motorista, para que ele vá ao fim da fila.

**Critérios de aceite**
- [x] Penalizados são ordenados depois dos demais
- [x] Banimento do dia impede a entrada na fila

### SCRUM-20 – Ajustar a fila manualmente pelo app  
`Story` · **Must** · 8 SP · v1.0.1 · _Done_ · labels: `escala`, `app`

> Como administrador, quero inserir, mover e remover motoristas da fila, para corrigir situações excepcionais.

**Critérios de aceite**
- [x] Setas ▲▼ reordenam
- [x] Botão + insere em posição
- [x] Lixeira remove
- [x] A escala é recalculada

### SCRUM-21 – Fixar motorista no apoio  
`Story` · **Could** · 5 SP · v1.0.1 · _Done_ · labels: `escala`

> Como administrador, quero fixar um motorista no apoio, para que o recálculo automático não o mova.

**Critérios de aceite**
- [x] isApoioManual=true mantém a posição
- [x] Desfixar reintegra à fila e recalcula

### SCRUM-49 – Extrair lógica das rotas /whatsapp para services  
`Task` · **Should** · 8 SP · v1.2.0 · _To Do_ · labels: `escala`, `debito`

> Melhorar a testabilidade da escala.

**Critérios de aceite**
- [ ] RotasWhatsApp só chama controllers
- [ ] Testes unitários das regras de categorização


## SCRUM-4 · Rotas e atribuições

### SCRUM-22 – Cadastrar rota com ordem de passageiros  
`Story` · **Must** · 8 SP · v1.0.0 · _Done_ · labels: `rotas`, `backend`

> Como administrador, quero montar rotas com passageiros em ordem, para orientar o embarque.

**Critérios de aceite**
- [x] A ordem do array define ordem_na_rota 1..N
- [x] Rota pertence a um turno (tarde/madrugada)
- [x] Editar a rota reordena os passageiros

### SCRUM-23 – Ver rotas do turno com motorista  
`Story` · **Must** · 8 SP · v1.0.0 · _Done_ · labels: `rotas`, `app`

> Como administrador, quero ver as rotas da tarde e da madrugada com o motorista designado, para acompanhar a operação.

**Critérios de aceite**
- [x] GET /whatsapp/rotas-tarde e /rotas-madrugada
- [x] Madrugada usa a regra X+2
- [x] Rota sem motorista aparece vazia (null)

### SCRUM-24 – Solicitar corrida pelo WhatsApp  
`Story` · **Should** · 8 SP · v1.0.1 · _Done_ · labels: `rotas`, `bot`

> Como passageiro, quero solicitar minha corrida de ida/volta pelo grupo, para confirmar que vou usar o transporte.

**Critérios de aceite**
- [x] @solicitacao registra IDA ou VOLTA na data
- [x] O app mostra check verde nos passageiros confirmados
- [x] Solicitação duplicada não é registrada

### SCRUM-25 – Alocar motorista manualmente em uma rota  
`Story` · **Must** · 5 SP · v1.0.1 · _Done_ · labels: `rotas`

> Como administrador, quero trocar ou liberar o motorista de uma rota, para cobrir faltas.

**Critérios de aceite**
- [x] Motorista 'só plantão' é recusado com 400
- [x] whatsappId vazio libera a vaga
- [x] A alocação manual não é sobrescrita pelo robô

### SCRUM-43 – Rota POST /whatsapp/escala/rota-manual duplicada  
`Bug` · **Should** · 2 SP · v1.2.0 · _To Do_ · labels: `rotas`, `debito`

> A segunda definição nunca é executada pelo Express.

**Critérios de aceite**
- [ ] Apenas uma definição (versão upsert)
- [ ] Teste cobrindo liberar e alocar vaga


## SCRUM-5 · Bot WhatsApp

### SCRUM-16 – Entrar na fila com joinha  
`Story` · **Must** · 8 SP · v0.5.0 · _Done_ · labels: `escala`, `bot`

> Como motorista, quero reagir com 👍 à mensagem do dia, para garantir minha posição na fila.

**Critérios de aceite**
- [x] Dado a mensagem do dia, Quando reajo com 👍, Então sou inserido com a hora da reação
- [x] Reagir duas vezes não duplica
- [x] Remover a reação remove da fila

### SCRUM-51 – Notificar motorista no privado quando a escala sair  
`Story` · **Could** · 8 SP · Backlog · _To Do_ · labels: `bot`, `redis`

> Como motorista, quero receber minha categoria e rota no privado, para não procurar no grupo.

**Critérios de aceite**
- [ ] Consumidor do evento moove.escala.gerada envia mensagem individual
- [ ] Migrar os canais para Redis Streams com consumer groups (entrega garantida também para o microsserviço de auditoria)


## SCRUM-6 · App mobile de gestão

### SCRUM-26 – Login no app  
`Story` · **Must** · 3 SP · v0.1.0 · _Done_ · labels: `app`, `seguranca`

> Como administrador, quero entrar no app com e-mail e senha, para acessar as funções de gestão.

**Critérios de aceite**
- [x] Credenciais válidas retornam JWT
- [x] Credenciais inválidas retornam 401
- [x] O token é enviado nas requisições


## SCRUM-7 · Segurança e acesso

### SCRUM-27 – Controle de acesso por papel  
`Story` · **Must** · 5 SP · v1.0.1 · _Done_ · labels: `seguranca`, `backend`

> Como administrador, quero que usuários comuns não excluam cadastros, para proteger os dados.

**Critérios de aceite**
- [x] Rotas de escrita exigem permissão do papel
- [x] Sem permissão retorna 403
- [x] Papéis/permissões semeados no boot

### SCRUM-28 – Bloquear acesso direto à API pelo navegador  
`Story` · **Should** · 3 SP · v1.0.1 · _Done_ · labels: `seguranca`, `infra`

> Como responsável técnico, quero bloquear a navegação direta à API, para não expor dados a curiosos.

**Critérios de aceite**
- [x] Navegação direta externa retorna 403
- [x] App e localhost continuam funcionando

### SCRUM-42 – Exigir JWT nas rotas /whatsapp/*  
`Task` · **Must** · 3 SP · v1.2.0 · _To Do_ · labels: `seguranca`, `debito`

> Débito técnico: hoje as rotas /whatsapp/* dependem só do Nginx.

**Critérios de aceite**
- [ ] Todas as rotas /whatsapp/* com autenticar + USUARIO_GERENCIAR_ESCALA
- [ ] App envia o token


## SCRUM-8 · Infra, performance e observabilidade

### SCRUM-29 – Orquestrar serviços com Docker Compose  
`Story` · **Must** · 5 SP · v1.0.1 · _Done_ · labels: `infra`

> Como desenvolvedor, quero subir todo o ambiente com um comando, para padronizar desenvolvimento e produção.

**Critérios de aceite**
- [x] docker compose up sobe db, redis, backend e nginx
- [x] Banco/cache/API sem portas públicas
- [x] Healthchecks configurados

### SCRUM-30 – Cache das listagens com Redis  
`Story` · **Must** · 8 SP · v1.1.0 · _Done_ · labels: `infra`, `backend`, `redis`

> Como administrador, quero que as telas de rotas e empresas abram rápido, para agilizar a operação no pico.

**Critérios de aceite**
- [x] Dado cache vazio, Quando listo rotas, Então busca no MySQL e grava no Redis com TTL
- [x] Na 2ª chamada vem do cache
- [x] Ao editar rota/passageiro/empresa o cache é invalidado
- [x] Sem Redis a API responde pelo banco

### SCRUM-31 – Publicar eventos de domínio no Redis Pub/Sub  
`Story` · **Must** · 5 SP · v1.1.0 · _Done_ · labels: `infra`, `backend`, `redis`

> Como desenvolvedor, quero publicar eventos quando cadastros mudam, para desacoplar efeitos colaterais.

**Critérios de aceite**
- [x] Alterações publicam em moove.*.alterado
- [x] Assinantes invalidam o cache em todas as instâncias
- [x] Logs mostram publicação e recebimento

### SCRUM-32 – Corrigir configuração do Nginx  
`Story` · **Must** · 3 SP · v1.1.0 · _Done_ · labels: `infra`

> Como responsável técnico, quero um nginx.conf válido com TLS, rate limit e correlation ID, para ter uma borda segura.

**Critérios de aceite**
- [x] nginx -t sem erros
- [x] HTTP e HTTPS funcionando
- [x] 429 acima de 20 r/s por IP
- [x] X-Request-Id propagado

### SCRUM-33 – Logs estruturados e métricas  
`Story` · **Must** · 5 SP · v1.1.0 · _Done_ · labels: `infra`, `observabilidade`

> Como responsável técnico, quero logs JSON e métricas Prometheus, para diagnosticar problemas rapidamente.

**Critérios de aceite**
- [x] Toda requisição gera log com idRequisicao, status e duração
- [x] GET /metrics expõe contadores e histograma
- [x] Erros retornam idRequisicao

### SCRUM-34 – Health checks  
`Story` · **Must** · 2 SP · v1.1.0 · _Done_ · labels: `infra`, `observabilidade`

> Como operador, quero endpoints de saúde, para monitorar e automatizar deploy.

**Critérios de aceite**
- [x] /health responde 200 se o processo vive
- [x] /health/ready informa MySQL, Redis e WhatsApp
- [x] MySQL fora → 503

### SCRUM-35 – Resiliência a falhas de dependências  
`Story` · **Should** · 5 SP · v1.1.0 · _Done_ · labels: `infra`, `resiliencia`

> Como operador, quero que falhas transitórias não derrubem o sistema, para manter a disponibilidade.

**Critérios de aceite**
- [x] Retry com backoff ao conectar no MySQL
- [x] Timeout nas chamadas ao Redis
- [x] Circuit breaker disponível
- [x] Encerramento gracioso em SIGTERM

### SCRUM-36 – Pipeline CI/CD  
`Story` · **Must** · 8 SP · v1.1.0 · _Done_ · labels: `infra`, `cicd`

> Como equipe, quero build, testes e deploy automatizados, para entregar com segurança.

**Critérios de aceite**
- [x] PR roda typecheck, testes e build
- [x] Imagem versionada pelo SHA
- [x] Deploy na main exige aprovação
- [x] Rollback automático se o health falhar

### SCRUM-44 – Desligar synchronize do TypeORM em produção  
`Task` · **Must** · 2 SP · v1.2.0 · _To Do_ · labels: `infra`, `debito`

> Evitar alteração automática de esquema.

**Critérios de aceite**
- [ ] synchronize=false fora de dev
- [ ] Deploy roda migration:run

### SCRUM-47 – Circuit breaker no envio de mensagens do WhatsApp  
`Task` · **Should** · 3 SP · v1.2.0 · _To Do_ · labels: `resiliencia`

> Proteger o app quando o WhatsApp estiver instável.

**Critérios de aceite**
- [ ] enviarMensagemExterna envolvido pelo CircuitBreaker
- [ ] App recebe 503 rápido quando aberto

### SCRUM-48 – Migrar console.log legado para logger estruturado  
`Task` · **Should** · 3 SP · v1.2.0 · _To Do_ · labels: `observabilidade`, `debito`

> Padronizar logs do bot e da escala.

**Critérios de aceite**
- [ ] Sem console.log em bot/ e service/whatsapp/
- [ ] Logs com modulo

### SCRUM-50 – Stack Prometheus + Grafana + Loki  
`Story` · **Should** · 8 SP · v1.2.0 · _To Do_ · labels: `observabilidade`

> Como operador, quero dashboards e alertas, para acompanhar os SLOs.

**Critérios de aceite**
- [ ] docker-compose.observabilidade.yml
- [ ] Dashboards RED e de dependências
- [ ] Alertas dos SLOs

### SCRUM-52 – Microsserviço de auditoria de eventos  
`Story` · **Must** · 13 SP · v1.1.0 · _Done_ · labels: `microsservico`, `redis`, `infra`

> Como administrador, quero consultar o histórico de escalas geradas e de alterações em rotas, motoristas e empresas, para resolver contestações da operação.

**Critérios de aceite**
- [x] Dado um evento moove.* publicado, Então ele é gravado no banco próprio do serviço (idempotente pelo id)
- [x] GET /auditoria/eventos filtra por tipo e período, paginado (máx. 100)
- [x] Rotas de consulta exigem JWT do /login
- [x] Se o banco da auditoria cair, os eventos vão para a DLQ e são reprocessados
- [x] Deploy, banco, imagem e pipeline independentes do monólito
- [x] Se o serviço cair, o monólito segue funcionando


## SCRUM-9 · Documentação e gestão

### SCRUM-37 – Documentação arquitetural  
`Story` · **Must** · 5 SP · v1.1.0 · _Done_ · labels: `docs`

> Como avaliador/novo membro, quero C4, ADRs e Quality Scenarios, para entender o sistema e suas decisões.

**Critérios de aceite**
- [x] C4 contexto e containers
- [x] ADRs das decisões principais
- [x] Quality scenarios com medidas

### SCRUM-38 – DDD: context map e modelo de domínio  
`Story` · **Must** · 3 SP · v1.1.0 · _Done_ · labels: `docs`, `ddd`

> Como equipe, quero mapear subdomínios e bounded contexts, para orientar a evolução do monólito modular.

**Critérios de aceite**
- [x] Context map com padrões de relacionamento
- [x] Entities, VOs e aggregates do contexto Escala

### SCRUM-39 – Contrato OpenAPI  
`Story` · **Must** · 3 SP · v1.1.0 · _Done_ · labels: `docs`, `api`

> Como dev do app, quero o contrato OpenAPI, para integrar sem ler o código do back-end.

**Critérios de aceite**
- [x] openapi.yaml válido
- [x] Abre no Swagger UI

### SCRUM-40 – SLOs, observabilidade e runbook  
`Story` · **Must** · 3 SP · v1.1.0 · _Done_ · labels: `docs`, `operacao`

> Como operador, quero SLOs e um runbook, para saber o que medir e como agir em incidentes.

**Critérios de aceite**
- [x] SLOs com SLI e error budget
- [x] Runbook cobre API, MySQL, Redis, WhatsApp, escala e rollback

### SCRUM-41 – Gestão: Cynefin, PM Canvas e Jira  
`Story` · **Must** · 3 SP · v1.1.0 · _Done_ · labels: `docs`, `gestao`

> Como gerente de projeto, quero documentar a abordagem e o plano, para conduzir o ciclo de vida.

**Critérios de aceite**
- [x] Cynefin com justificativa
- [x] PM Canvas completo
- [x] Backlog importável no Jira

### SCRUM-45 – Encapsular Value Objects (CPF, CNPJ, Telefone, LID)  
`Task` · **Could** · 5 SP · v1.2.0 · _To Do_ · labels: `ddd`, `debito`

> Centralizar validações em objetos imutáveis.

**Critérios de aceite**
- [ ] Classes VO com validação no construtor
- [ ] Services usam os VOs

### SCRUM-46 – Padronizar recursos REST em /v2  
`Task` · **Could** · 5 SP · Backlog · _To Do_ · labels: `api`, `debito`

> Nomes no plural e verbos HTTP consistentes.

**Critérios de aceite**
- [ ] /v2 publicado em paralelo
- [ ] OpenAPI atualizado


---
**Resumo:** 41 itens · 215 SP no total · 168 SP concluídos · 47 SP restantes.
