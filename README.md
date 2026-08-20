# Reforma — Controle e Análise de Gastos

Sistema para registrar e acompanhar os gastos de uma reforma: cadastro de despesas (valor, descrição, categoria, data e observação), edição e exclusão, e uma dashboard com indicadores, gráficos e filtros alimentados pelos dados reais cadastrados.

## Stack

- **Backend:** NestJS + TypeScript + Prisma + PostgreSQL + Swagger
- **Frontend:** Angular 19 (standalone components, signals) + Angular Material + ApexCharts

## Estrutura

```
projeto-reforma/
├── backend/    # API REST (NestJS) — módulo de despesas (expenses)
└── frontend/   # Interface web (Angular) — dashboard de gastos
```

## Como rodar (ambiente local)

Requer Node.js 18.19+ (o frontend usa Angular 19, compatível com Node 18/20/22) e Docker.

### 1. Banco de dados (Docker)

```bash
cd backend
cp .env.example .env   # já vem preenchido com valores padrão para desenvolvimento local
docker compose up -d
```

Isso sobe um PostgreSQL 16 com um volume nomeado (`reforma_postgres_data`), então os dados persistem entre reinícios do container.

### 2. Backend (API)

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

- API: http://localhost:3000
- Documentação Swagger: http://localhost:3000/docs

### 3. Frontend

```bash
cd frontend
npm install
npm start
```

- Aplicação: http://localhost:4200

## Funcionalidades

- **Dashboard** (`/dashboard`, tela inicial): visão geral somente leitura — indicador de orçamento geral (orçamento inicial, total comprometido, total gasto, saldo, % consumido, com aviso visual quando o orçamento é excedido), painéis de Pedreiro/Eletricista/Tio Neguinho (responsável pela obra), card de duração da obra, cards (quantidade de despesas, maior despesa, categoria que mais consumiu) e gráficos (distribuição por categoria, ranking de categorias, evolução mensal, últimas despesas). Sem formulário de cadastro.
- **Despesas** (`/despesas`): listagem, filtros (período, categoria, descrição), cadastro, edição e exclusão de despesas (valor, descrição, categoria, data, observação opcional). **Única** tela onde gastos são cadastrados — inclusive os de Pedreiro, Eletricista e Tio Neguinho: basta escolher essa categoria na despesa, sem nenhum cadastro separado.
- **Configurações → Orçamento** (`/configuracoes/orcamento`): define o orçamento geral da reforma e os orçamentos específicos de Pedreiro, Eletricista e Tio Neguinho (responsável pela obra). Cada orçamento específico representa uma reserva dentro do orçamento geral; o gasto de cada um é calculado automaticamente a partir das despesas da categoria correspondente — sem duplicar a contagem entre o orçamento geral e os específicos.
- **Configurações → Obra** (`/configuracoes/obra`): data de início e término da obra; a dashboard calcula e exibe a duração automaticamente (em andamento ou finalizada).
- Categorias fixas (eletrodomésticos, materiais, pedreiro, eletricista, marceneiro, marmoreiro, serralheiro, vidraceiro, ladrilheiro, instalador de porta, Tio Neguinho (responsável pela obra), aluguel de materiais, remoção de entulho, outros), servidas pela API em `GET /expenses/categorias`.
- Todos os campos de valor usam máscara de moeda no padrão brasileiro (R$ 1.234,56) durante a digitação; o valor é sempre persistido como número decimal no banco.
- Todos os valores são calculados a partir dos dados reais persistidos no PostgreSQL — nada é mockado.
