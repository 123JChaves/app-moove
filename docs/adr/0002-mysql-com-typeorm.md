# ADR-0002: MySQL 8 + TypeORM como banco de dados

- **Status:** Aceita
- **Data:** 2026-04-21
- **Decisores:** Equipe Moove

## Contexto e problema

O domínio é **altamente relacional**: motorista ↔ ordem na fila ↔ lista do dia ↔ atribuição ↔ rota ↔ passageiros ↔ empresa ↔ endereço ↔ bairro ↔ cidade ↔ estado ↔ país. Usuários se ligam a papéis e permissões (RBAC N:N).
A geração da escala precisa de **consistência forte**: um motorista não pode aparecer duas vezes na fila nem ficar com duas rotas no mesmo turno. Também precisa de consultas por data (`DATE(lista.dia) = ?`).

## Opções consideradas

1. **MySQL 8** (relacional, ACID) + ORM TypeORM
2. **PostgreSQL** + TypeORM/Prisma
3. **MongoDB** (documentos)

## Decisão

**MySQL 8 com TypeORM e migrations versionadas** (`whatsappBot/src/migrations`).

- **Relacional + ACID**: integridade referencial (`onDelete: CASCADE`), unicidade (CPF, CNPJ, `whatsAppLid`) e transações para reordenar a fila.
- **MongoDB descartado**: o modelo tem muitos relacionamentos N:N e consultas cruzadas (rotas × passageiros × solicitações), o que levaria a `$lookup` complexos e a perder integridade.
- **PostgreSQL × MySQL**: os dois atenderiam. O MySQL foi escolhido porque a equipe já domina, já existe no ambiente local (Windows/XAMPP) e tem imagem oficial leve para o Docker. Os recursos exclusivos do PostgreSQL (JSONB, CTEs avançadas) não são necessários hoje.
- **TypeORM**: entidades com decorators em TypeScript, migrations geradas automaticamente e suporte a QueryBuilder para as consultas de escala.

## Consequências

- ✅ Integridade dos dados garantida pelo banco, com o esquema versionado em migrations.
- ✅ Leituras pesadas (rotas com passageiros, endereços e empresas) aliviadas pelo cache Redis ([ADR 0003](0003-redis-cache-aside.md)).
- ⚠️ `synchronize: true` no `data-source.ts` é perigoso em produção (pode alterar o esquema sozinho). **Ação:** desligar em produção e usar só `migration:run` (backlog **SCRUM-44**).
- ⚠️ Datas com fuso exigem cuidado. A decisão foi gravar `dataViagem` como texto `AAAA-MM-DD` e usar `timezone: '-03:00'`.
- 🔁 Reavaliar se surgirem necessidades geoespaciais (PostGIS para otimizar rotas).
