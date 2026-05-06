# Enel CRM — Documentação do Sistema

## O que é esse sistema?

CRM interno desenvolvido para a equipe comercial da Enel gerenciar o pipeline de vendas de dois contratos: **Open Network** e **Power Network**. O sistema permite cadastrar oportunidades, importar dados de planilhas internas (Forecast, PCR e FUP), acompanhar o forecast mensal por projeto e visualizar dashboards executivos consolidados.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Node.js + Express + TypeScript |
| Banco de dados | SQLite (via `better-sqlite3`) |
| Gráficos | Recharts |
| Ícones | Lucide React |
| Export Excel | ExcelJS |
| Upload de arquivos | Multer |
| Estilo | Inline CSS + CSS Variables |

---

## Estrutura de Pastas

```
enel-crm/
├── frontend/
│   └── src/
│       ├── pages/          # Páginas da aplicação
│       ├── components/     # Componentes reutilizáveis
│       ├── utils/          # API client e formatadores
│       └── types.ts        # Tipos compartilhados
│
├── backend/
│   └── src/
│       ├── routes/         # Rotas REST da API
│       ├── database.ts     # Schema e setup do SQLite
│       ├── types.ts        # Tipos e constantes
│       └── index.ts        # Entry point Express
│
└── data/
    └── enel_crm.db         # Banco SQLite (gerado em runtime)
```

---

## Banco de Dados

### Tabela `projetos`
Cada linha é uma oportunidade comercial.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | INTEGER PK | Autoincrement |
| `contrato` | TEXT | `'Open Network'` ou `'Power Network'` |
| `status` | TEXT | Ver seção de Status abaixo |
| `regional` | TEXT | Regional Enel responsável |
| `br` | TEXT | Número de BR (ex: `22461.428`) |
| `did` | TEXT | Identificador DID |
| `oportunidade` | TEXT | Nome da oportunidade (obrigatório) |
| `cf` | REAL | Fator de conversão (default 0.29) |
| `valor_liq` | REAL | Valor líquido do contrato |
| `valor_bruto` | REAL | Valor bruto (DDP) |
| `po_pendente` | REAL | PO pendente |
| `fob` | REAL | Custo FOB |
| `solicitante` | TEXT | Nome do solicitante |
| `status_compra` | TEXT | Status do processo de compra |
| `status_po` | TEXT | Status da PO |
| `margem1` | REAL | 1ª margem (decimal, ex: 0.35 = 35%) |
| `margem2` | REAL | 2ª margem (decimal) |
| `created_at` | TEXT | Timestamp UTC |
| `updated_at` | TEXT | Timestamp UTC |

### Tabela `forecast_mensal`
Distribuição mensal de cada projeto (12 linhas por projeto, uma por mês).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | INTEGER PK | Autoincrement |
| `projeto_id` | INTEGER FK | Referência a `projetos.id` |
| `mes` | TEXT | `'Jan'` a `'Dez'` |
| `revenues` | REAL | Receita prevista no mês |
| `bookings` | REAL | Bookings do mês |
| `invoices` | REAL | Invoices do mês |
| `margem1` | REAL | Margem 1 do mês |
| `margem2` | REAL | Margem 2 do mês |

### Tabela `metas`
Targets anuais por contrato.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | INTEGER PK | Autoincrement |
| `contrato` | TEXT | Contrato |
| `ano` | INTEGER | Ano (ex: 2026) |
| `target_ano` | REAL | Meta anual |

Valor padrão inicial (seed): Open Network = R$ 34.000.000, Power Network = R$ 32.989.000.

---

## Status de Oportunidade

| Status | Cor | Significado |
|--------|-----|-------------|
| `Closed Win` | Verde | Contrato fechado/ganho |
| `Commit` | Azul | Alta probabilidade, compromissado |
| `Upside` | Laranja | Possível, sem garantia |
| `Not Forecastable` | Cinza | Incerto demais para incluir no forecast |
| `Closed Lost` | Vermelho | Oportunidade perdida — **não entra nos totais** |

> **Regra importante**: Closed Lost aparece listado e com seu valor visível na interface, mas é excluído de todos os cálculos de total, revenues e margens ponderadas — tanto no frontend quanto nas queries do backend.

---

## Páginas

### Dashboard (`/dashboard`)
Visão executiva consolidada. Exibe:
- 6 metric cards: Total Forecast, Open Network, Power Network, Closed Win, Commit, Upside
- Barra de progresso contra a meta anual (aviso visual abaixo de 80%)
- Gráfico de barras mensais (Open Network + Power Network sobrepostos)
- Pie chart de distribuição por status para Open Network
- Tabela de quarters (Q1-Q4) com subtotais por contrato
- Cards por regional do Open Network

Os valores de `revenues` são calculados no backend excluindo `Closed Lost`.

### Pipeline — Open Network / Power Network
Tabela de oportunidades do contrato selecionado. Exibe:
- Filtros por status, regional e busca por nome
- Cards de resumo: total (excluindo Closed Lost), Closed Win, Commit, Upside
- Gráfico de composição do pipeline por status
- Ações por linha: editar e deletar
- Botão "Novo Projeto" para abrir o modal de criação

A ordenação segue: regional (na ordem definida) → status (na ordem definida).

### Forecast (`/forecast`)
Tabela de todos os projetos com distribuição de receita mensal. Exibe:
- Filtros por contrato e regional
- Três modos de visualização: só quarters / só meses / ambos
- Cards de resumo por regional
- Coluna da oportunidade fixada (sticky) para scroll horizontal
- Colunas de valor líquido, 2ª margem e os meses/quarters selecionados
- Linha de total por regional

### Detalhamento de Quarters (`/quarters`)
Visão detalhada de Q1-Q4 separada por contrato. Exibe:
- Seções Open Network e Power Network
- Dentro de cada contrato, blocos por regional com tabela de projetos
- Distribuição por quarter de cada projeto
- Linha de total por regional com 2ª margem média ponderada
- Botão de exportar para Excel (download automático de `.xlsx` formatado)

### Importar (`/importar`)
Três seções independentes de importação:

#### 1. Forecast (planilha genérica)
- Aceita `.xlsx` ou `.xlsb`
- Lê três abas: `OPEN NET - Forecast Details`, `POWER NET - Forecast Details`, `Forecast Full Year`
- Modo **Replace**: deleta tudo e reimporta
- Modo **Merge**: upsert por `(br, oportunidade, contrato)`
- Retorna contagem de inseridos/atualizados

#### 2. PCR (Resumo ITL)
- Aceita `.xlsm`
- Lê apenas a aba `Resumo ITL`
- Extrai campos de células fixas (ver tabela abaixo)
- Status fixo: `Not Forecastable`; CF fixo: `0.29`
- Regional é inferida do nome do projeto por regex
- Cria o projeto automaticamente e exibe card de confirmação com link para edição

Mapeamento de células da aba Resumo ITL:
| Campo | Linha | Coluna | Obs |
|-------|-------|--------|-----|
| BR | 29 | C | Remove prefixo "BR ", formata com 3 decimais |
| Oportunidade | 30 | C | Remove prefixo "Projeto: " |
| FOB | 49 | N | Custo Total |
| Margem | 49 | O | Em decimal |
| Valor Líquido | 49 | P | |
| Valor Bruto | 49 | R | DDP |

#### 3. FUP (Foglio Estero)
- Aceita `.xlsm`
- Lê a aba `Foglio Estero`
- Colunas mapeadas: BR (A), Revenues (AN–AY), Margem1 (BA–BL), Margem2 (BN–BY)
- Soma BRs repetidos dentro do mesmo arquivo
- Faz matching com projetos existentes de Open Network pelo campo `br`
- Fluxo em duas etapas:
  1. **Preview**: mostra tabela com projetos encontrados/não encontrados antes de salvar
  2. **Confirmar**: atualiza `valor_liq`, `margem1`, `margem2` dos projetos e os 12 registros de `forecast_mensal`

---

## Componentes Reutilizáveis (`ui.tsx`)

| Componente | Descrição |
|-----------|-----------|
| `MetricCard` | Card com valor principal, subtítulo e accent color |
| `StatusBadge` | Badge colorido com o status da oportunidade |
| `ProgressBar` | Barra de progresso com animação |
| `SectionHeader` | Cabeçalho de seção com título, subtítulo e slot de ações |
| `Card` | Container branco com border e padding padrão |
| `Table` | Tabela genérica com colunas configuráveis e render functions |
| `Btn` | Botão com variantes (`primary`, `secondary`, `danger`) e tamanhos |
| `FilterBar` | Barra com input de busca + dropdowns de filtro |
| `Modal` | Overlay + janela modal com título e onClose |
| `FormField` | Wrapper de label + input/select com estilo padrão |
| `Input` / `Select` | Inputs estilizados para uso dentro de formulários |

---

## API — Rotas do Backend

### `GET /api/projetos`
Lista projetos com filtros opcionais: `contrato`, `regional`, `status`, `search`.

### `GET /api/projetos/:id`
Retorna um projeto com seus 12 registros de `forecast_mensal`.

### `POST /api/projetos`
Cria projeto + forecast. Body:
```json
{
  "contrato": "Open Network",
  "status": "Commit",
  "regional": "Enel SP",
  "oportunidade": "Nome do projeto",
  "valor_liq": 500000,
  "margem1": 0.35,
  "margem2": 0.22,
  "forecast": { "Jan": 50000, "Fev": 50000, ... }
}
```

### `PUT /api/projetos/:id`
Atualiza projeto + recria forecast.

### `DELETE /api/projetos/:id`
Deleta projeto e todos os registros de forecast em cascade.

### `GET /api/dashboard`
Retorna consolidação completa para o Dashboard. Campos principais:
- `openNetwork.byRegional[]`: revenues, bookings, margens por regional (sem Closed Lost)
- `powerNetwork`: revenues, closed_win, margens (sem Closed Lost)
- `grandTotal`: total_liq, closed_win, commit, upside, not_forecastable, closed_lost, margens
- `metas[]`, `quarterSummary[]`, `monthlyChart[]`, `statusBreakdown[]`

### `GET /api/dashboard/regionais`
Detalhe por regional Open Network com Q1-Q4 e margem ponderada.

### `GET /api/forecast`
Projetos com agregação mensal por regional. Parâmetros: `contrato`, `regional`.

### `POST /api/import`
Upload da planilha Forecast. Form-data: `file` (xlsx/xlsb), `mode` (`replace` | `merge`).

### `POST /api/import-pcr`
Upload de PCR. Form-data: `file` (xlsm), `contrato`.

### `POST /api/import-fup/preview`
Preview do FUP. Form-data: `file` (xlsm). Retorna linhas com status de matching.

### `POST /api/import-fup`
Confirma e salva o FUP. Mesmo form-data do preview.

### `GET /api/export/quarters`
Download direto de arquivo `.xlsx` com o relatório de quarters formatado.

### `GET /api/health`
Healthcheck básico: `{ status: 'ok', ts: '...' }`.

---

## Como rodar localmente

```bash
# Backend (porta 3001)
cd backend
npm install
npm run dev

# Frontend (porta 5173)
cd frontend
npm install
npm run dev
```

O banco SQLite é criado automaticamente em `data/enel_crm.db` na primeira execução. O frontend faz proxy para `http://localhost:3001`.

---

## Fluxos principais resumidos

### Criar uma oportunidade manualmente
1. Pipeline → "Novo Projeto"
2. Preencher dados na aba "Dados do Projeto"
3. Distribuir receita por mês na aba "Forecast Mensal"
4. Salvar → `POST /api/projetos`

### Importar via FUP
1. Importar → seção FUP → upload do `.xlsm`
2. Revisar o preview (projetos matched em verde, não encontrados em vermelho)
3. Confirmar → backend atualiza valores e forecast dos projetos encontrados

### Exportar relatório de quarters
1. Detalhamento de Quarters → botão "Exportar Excel"
2. Download automático do `.xlsx` formatado

---

## Observações para o desenvolvedor

- **Closed Lost nunca entra em totais**: Qualquer novo cálculo de soma/média ponderada deve filtrar `status != 'Closed Lost'`. Isso vale tanto para queries SQL no backend quanto para `.reduce()` no frontend.
- **Margens são decimais no banco**: `margem1 = 0.35` significa 35%. A formatação para exibição (`fmtMargem`) converte para porcentagem.
- **Forecast mensal é sempre 12 registros**: Ao criar ou atualizar um projeto, o backend deleta e recria todos os 12 registros de `forecast_mensal` para aquele `projeto_id`.
- **WAL mode ativo**: O SQLite está configurado com WAL para melhor concorrência de leitura/escrita.
- **CORS fixo para `localhost:5173`**: Em produção, ajustar no `backend/src/index.ts`.
- **Sem autenticação**: O sistema não tem login nem controle de acesso — assume ambiente interno/controlado.
