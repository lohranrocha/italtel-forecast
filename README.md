# CRM Enel 2026 — Forecast & Pipeline

Sistema interno para gestão do pipeline Open Network e Power Network com a Enel, substituindo o processo manual em Excel.

---

## Pré-requisitos

- Node.js 18+ instalado
- npm 9+

---

## Estrutura do Projeto

```
enel-crm/
├── backend/      ← Node.js + TypeScript + Express + SQLite
└── frontend/     ← React + TypeScript + Vite
```

---

## Como Rodar (Primeira vez)

### 1. Backend

```bash
cd enel-crm/backend
npm install
npm run dev
```

O backend sobe em: `http://localhost:3001`

Você verá: `🚀 CRM Enel backend rodando em http://localhost:3001`

O banco SQLite é criado automaticamente em `backend/data/enel_crm.db`

### 2. Frontend (em outro terminal)

```bash
cd enel-crm/frontend
npm install
npm run dev
```

O frontend abre em: `http://localhost:5173`

---

## Como Usar (Fluxo recomendado)

### Passo 1 — Importar o Excel atual

1. Abra o sistema em `http://localhost:5173`
2. Clique em **Importar Excel** no menu lateral
3. Arraste o arquivo `Forecast Enel 2026.xlsx` (ou .xlsb)
4. Selecione o modo **Substituir tudo** (primeira importação)
5. Clique em **Importar Arquivo**

O sistema lê automaticamente:
- `OPEN NET - Forecast Details` → todos os projetos Open Network
- `POWER NET - Forecast Details` → todos os projetos Power Network
- `Forecast Full Year` → distribuição mensal Jan–Dez 2026

### Passo 2 — Verificar os dados

- **Dashboard CEO** → visão executiva com metas, quarters, gráficos
- **Open Network** → pipeline completo com filtros
- **Power Network** → pipeline completo
- **Forecast Full Year** → tabela por projeto com view Quarter / Mês / Ambos

### Passo 3 — Manutenção contínua

- Use o botão **+ Novo Projeto** nas páginas de pipeline para cadastros manuais
- Quando atualizar o Excel, reimporte usando modo **Mesclar** para preservar cadastros manuais
- Clique no ícone de lápis para editar qualquer projeto
- Cada projeto tem aba de **Forecast Mensal** para distribuir revenues mês a mês

---

## Módulos do Sistema

| Módulo | Descrição |
|---|---|
| Dashboard CEO | Revenues totais, metas, atingimento %, quarters, gráficos |
| Open Network | Pipeline completo — 92 projetos, filtros por status/regional/busca |
| Power Network | Pipeline completo — 24 projetos |
| Forecast Full Year | Tabela dinâmica Quarter+Mês por projeto |
| Importar Excel | Upload do .xlsx, modos Substituir ou Mesclar |

---

## Dados Importados do Seu Excel

| Campo | Coluna no Excel |
|---|---|
| Status | `STATUS` (Closed Win, Commit, Upside, Not Forecastable, Closed Lost) |
| BR | Número do projeto (ex: 22461.342) |
| Regional | Enel RJ, Enel SP, Enel CE, Enel EGP, Enel X |
| Oportunidade | Nome do projeto |
| CF | Probabilidade (0.0 a 1.0) |
| Valor Líquido | Valor sem impostos |
| Valor Bruto | Valor com impostos |
| FOB | Valor FOB |
| Solicitante | Responsável pelo pedido |
| Status Compra / PO | Status da ordem de compra |
| 1ª e 2ª Margem | Margens brutas |
| Forecast mensal | Jan a Dez 2026 (revenues por mês) |

---

## Para Subir na Intranet (futuro)

Quando for apresentar internamente, o sistema já está preparado para migração:

1. **Banco**: Trocar SQLite por PostgreSQL — editar apenas `backend/src/database.ts`
2. **Frontend build**: `cd frontend && npm run build` → gera pasta `dist/` pronta para servir
3. **Backend**: `cd backend && npm run build && npm start` → modo produção

---

## Problemas Comuns

**"Erro ao carregar dados"** → Backend não está rodando. Execute `npm run dev` dentro de `backend/`

**"Erro ao importar"** → Verifique se o arquivo tem as abas `OPEN NET - Forecast Details`, `POWER NET - Forecast Details` e `Forecast Full Year`

**Dados zerados após reiniciar** → Normal apenas se o arquivo `backend/data/enel_crm.db` for deletado. Os dados persistem entre sessões.
