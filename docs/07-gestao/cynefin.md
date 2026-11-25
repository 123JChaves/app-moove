# Análise do contexto com o Framework Cynefin e escolha da abordagem

## 1. O framework

O **Cynefin** (Dave Snowden) classifica problemas pela relação entre **causa e efeito**:

| Domínio | Causa e efeito | Como agir | Tipo de prática |
|---|---|---|---|
| **Simples / Claro** | Óbvia para todos | Sentir → Categorizar → Responder | Boas práticas |
| **Complicado** | Descobrível por análise de especialista | Sentir → Analisar → Responder | Práticas adequadas |
| **Complexo** | Só visível em retrospecto; o sistema muda ao ser observado | **Experimentar → Sentir → Responder** | Práticas emergentes |
| **Caótico** | Não há relação perceptível | Agir → Sentir → Responder | Práticas novas |

## 2. Classificação das partes do Moove

| Parte do projeto | Domínio | Evidência |
|---|---|---|
| CRUD de empresas, passageiros, endereços | 🟢 **Simples** | Padrão conhecido (routes → controller → service → repositório); requisitos estáveis |
| Infraestrutura (Docker, Nginx, Redis, MySQL, CI/CD) | 🔵 **Complicado** | Existem boas práticas documentadas; um especialista resolve com análise (ADRs 0002–0006) |
| **Regras da fila de joinhas e da escala** (plantão, apoio, penalização, dias livres, X+1/X+2, apoio manual) | 🟠 **Complexo** | As regras **surgiram do uso real**: o comportamento dos motoristas mudou conforme o sistema mudava (ex.: o "apoio manual" e a "trava de plantão" apareceram depois que a operação começou). Há 22 migrations em ~2 meses, sinal de que o modelo foi descoberto aos poucos |
| Integração com WhatsApp não oficial (Baileys) | 🟠 **Complexo** | Comportamento da plataforma imprevisível (LID × telefone, mudanças de protocolo, risco de banimento) |
| Adoção pelos usuários (motoristas e passageiros via grupo) | 🟠 **Complexo** | Depende de comportamento humano; só se aprende testando |
| Número banido / sessão perdida em horário de escala | 🔴 **Caótico** (situacional) | Exige **agir primeiro** (escala manual pelo app) e analisar depois. Tratado pelo [runbook](../05-entrega-continua/runbook-incidentes.md) |

Posicionamento no quadro do Cynefin (disposição canônica):

| ⬅️ Não ordenado | Ordenado ➡️ |
|---|---|
| 🟠 **COMPLEXO** *(maior parte do valor)*<br/>• Regras da fila e da escala<br/>• Integração WhatsApp (Baileys)<br/>• Adoção por motoristas e passageiros | 🔵 **COMPLICADO**<br/>• Docker, Nginx, Redis, MySQL<br/>• Pipeline CI/CD, observabilidade |
| 🔴 **CAÓTICO** *(situacional)*<br/>• Número banido / sessão perdida no horário da escala | 🟢 **CLARO / SIMPLES**<br/>• CRUD de empresas, passageiros e endereços |

## 3. Conclusão: domínio predominante = **COMPLEXO**

O **valor central** do Moove (escala automática e justa a partir das reações no WhatsApp) está no domínio **Complexo**. Os requisitos não podiam ser totalmente especificados no início. Eles foram **descobertos com experimentos curtos** e feedback dos administradores e motoristas.

## 4. Abordagem escolhida: **Híbrida, com predominância Ágil**

| Nível | Abordagem | Por quê |
|---|---|---|
| **Macro (projeto/disciplina)** | **Preditiva**: fases do ciclo de vida, marcos e **PM Canvas** | A disciplina tem **datas fixas de entrega** e escopo acadêmico mínimo (rubrica). Isso pede planejamento de marcos, papéis e riscos |
| **Construção do produto** | **Ágil: Scrum** (sprints de 2 semanas) | Domínio complexo → ciclos curtos de *experimentar → sentir → responder*, backlog priorizado e releases incrementais |
| **Sustentação / incidentes** | **Kanban** (fluxo contínuo com limite de WIP) | Bugs e incidentes de operação não esperam a sprint |

**Por que não 100% preditiva?** Um escopo detalhado e congelado no início teria especificado errado as regras de escala. As 22 migrations mostram quanto o modelo mudou.
**Por que não 100% ágil?** Os marcos acadêmicos e a necessidade de documentação formal (arquitetura, PM Canvas) são restrições fixas, mais bem tratadas com planejamento preditivo.

➡️ Detalhes: [ciclo-de-vida.md](ciclo-de-vida.md) · [pm-canvas.md](pm-canvas.md) · [product-backlog.md](product-backlog.md) · [jira.md](jira.md)
