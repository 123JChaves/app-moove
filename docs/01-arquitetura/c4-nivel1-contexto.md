# C4 – Nível 1: Diagrama de Contexto

> **Pergunta respondida:** *quem usa o Moove e com quais sistemas externos ele conversa?*

## Visão geral

O **Moove** organiza o **transporte de funcionários** (passageiros) das empresas clientes. Os **motoristas** entram na fila do dia reagindo com 👍 ("joinha") a uma mensagem no **grupo de WhatsApp**. Com essa fila, o sistema gera a **escala**: plantão, rotas da tarde (ida), rotas da madrugada (volta), apoio e backup. Depois atribui cada motorista a uma rota com passageiros. A administração acompanha e ajusta tudo pelo **app mobile**.

```mermaid
C4Contexto
    title Moove - Diagrama de Contexto (C4 Nível 1)

    Person(admin, "Administrador / Operador", "Cadastra empresas, passageiros, motoristas e rotas; acompanha e ajusta a escala pelo app.")
    Person(motorista, "Motorista", "Entra na fila do dia com 👍 no grupo, recebe a escala e a rota pelo WhatsApp.")
    Person(passageiro, "Passageiro", "Funcionário de empresa cliente; solicita corrida (ida/volta) pelo WhatsApp.")

    System(moove, "Moove", "Gerencia cadastros, fila de joinhas, geração de escala, atribuição de rotas e notificações.")

    System_Ext(whatsapp, "WhatsApp", "Plataforma de mensagens (Meta). Grupos de motoristas e de passageiros.")
    System_Ext(expo, "Expo / Lojas de App", "Distribuição e atualização do app mobile.")
    System_Ext(tunel, "Túnel HTTPS (ngrok)", "Exposição pública da API em ambiente de desenvolvimento/demonstração.")

    Rel(admin, moove, "Usa o app mobile", "HTTPS/JSON")
    Rel(motorista, whatsapp, "Envia 👍 e comandos (@escala, @cadastrar...)")
    Rel(passageiro, whatsapp, "Envia @solicitacao")
    Rel(moove, whatsapp, "Lê reações/mensagens e publica escalas, relatórios e avisos", "WebSocket (Baileys)")
    Rel(admin, expo, "Instala/atualiza o app")
    Rel(tunel, moove, "Encaminha requisições externas", "HTTPS")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

## Atores

| Ator | Canal | Principais necessidades |
|---|---|---|
| **Administrador / Operador** | App mobile (Expo/React Native) | Cadastros, geração e correção da escala, configurar feriados (dia livre), comunicados ao grupo |
| **Motorista** | Grupo de WhatsApp | Entrar na fila (👍), consultar escala/rota, cadastrar-se quando a janela está aberta |
| **Passageiro** | Grupos de WhatsApp de passageiros (4 grupos) | Solicitar corrida de ida (tarde) e volta (madrugada) |

## Sistemas externos

| Sistema | Tipo de integração | Risco principal | Mitigação |
|---|---|---|---|
| **WhatsApp** (via biblioteca Baileys) | WebSocket não oficial, sessão persistida em `sessao_whatsapp_socket/` | Desconexão / sessão expirada / mudança de protocolo | Reconexão automática, health check com status `whatsapp`, runbook (seção 4) e [ADR 0007](../adr/0007-integracao-whatsapp-baileys.md) |
| **Expo** | Build/distribuição do app | Quebra de versão do SDK | Typecheck do app no pipeline |
| **ngrok** | Túnel HTTPS | URL muda a cada sessão | Variáveis `EXPO_PUBLIC_IP_*` no `.env` |

## Fronteira do sistema

Fica **dentro** do Moove: API REST, bot do WhatsApp, agendamentos (cron), banco MySQL, cache/mensageria Redis, proxy Nginx e app mobile.
Fica **fora**: a plataforma WhatsApp em si, as lojas de aplicativos e os túneis de rede.

➡️ Próximo nível: [C4 – Containers](c4-nivel2-containers.md)
