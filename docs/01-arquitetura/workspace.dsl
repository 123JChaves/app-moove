/*
 * Modelo C4 do Moove como código (Structurizr DSL)
 * Visualizar: docker run -it --rm -p 8080:8080 -v ${PWD}/docs/01-arquitetura:/usr/local/structurizr structurizr/lite
 * e abrir http://localhost:8080
 */
workspace "Moove" "Gestão de transporte de funcionários com bot de WhatsApp" {

    model {
        admin = person "Administrador" "Opera cadastros e escalas pelo app."
        motorista = person "Motorista" "Entra na fila com 👍 no grupo do WhatsApp."
        passageiro = person "Passageiro" "Solicita corrida pelo WhatsApp."

        whatsapp = softwareSystem "WhatsApp" "Plataforma de mensagens (Meta)." "Externo"

        moove = softwareSystem "Moove" "Cadastros, fila de joinhas, escala, rotas e notificações." {
            app = container "App Mobile" "Interface do administrador." "React Native + Expo"
            nginx = container "Proxy Reverso" "TLS, rate limit, correlation id, WebSocket." "Nginx"
            api = container "API + Bot" "REST, regras de escala, bot WhatsApp, cron." "Node.js, Express, TypeORM, Baileys" {
                rotas = component "Routes/Controllers" "Endpoints REST" "Express"
                servicos = component "Services" "Regras de negócio" "TypeScript"
                escala = component "EscalaService" "Geração de escala e atribuições" "TypeScript"
                bot = component "WhatsAppController" "Leitura de reações/comandos e envio de mensagens" "Baileys"
                cacheSvc = component "CacheService" "Cache-aside com TTL" "ioredis"
                eventBus = component "EventBus" "Publicação/assinatura de eventos" "Redis Pub/Sub"
            }
            mysql = container "MySQL" "Dados transacionais." "MySQL 8" "Database"
            redis = container "Redis" "Cache distribuído e Pub/Sub." "Redis 7" "Database"
            auditoria = container "Microsserviço de Auditoria" "Consome eventos moove.* e expõe o histórico." "Node.js, Express, mysql2, ioredis"
            dbAuditoria = container "MySQL Auditoria" "Banco exclusivo do microsserviço." "MySQL 8" "Database"
        }

        admin -> app "Usa"
        motorista -> whatsapp "👍 e @comandos"
        passageiro -> whatsapp "@solicitacao"
        app -> nginx "REST" "HTTPS/JSON"
        nginx -> api "Proxy" "HTTP 8085"
        api -> mysql "Lê/grava" "TypeORM"
        api -> redis "Cache e eventos" "ioredis"
        api -> whatsapp "Mensagens" "WebSocket"
        nginx -> auditoria "Proxy /auditoria/*" "HTTP 8090"
        redis -> auditoria "Entrega eventos" "PSUBSCRIBE moove.*"
        auditoria -> dbAuditoria "Grava/consulta" "mysql2"

        rotas -> servicos "Chama"
        rotas -> escala "Chama"
        bot -> escala "Aciona"
        servicos -> cacheSvc "Lê/invalida"
        servicos -> eventBus "Publica eventos"
        cacheSvc -> redis "GET/SET/DEL"
        eventBus -> redis "PUBLISH/SUBSCRIBE"
        servicos -> mysql "Consulta"
        escala -> mysql "Consulta/grava"
        bot -> whatsapp "Envia/recebe"
    }

    views {
        systemContext moove "Contexto" {
            include *
            autoLayout lr
        }
        container moove "Containers" {
            include *
            autoLayout lr
        }
        component api "Componentes" {
            include *
            autoLayout lr
        }
        styles {
            element "Person" { shape Person background #08427b color #ffffff }
            element "Software System" { background #1168bd color #ffffff }
            element "Container" { background #438dd5 color #ffffff }
            element "Database" { shape Cylinder }
            element "Externo" { background #999999 color #ffffff }
        }
    }
}
