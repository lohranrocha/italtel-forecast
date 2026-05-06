# Funcionalidade: Importação de PCR (Resumo ITL)

## Objetivo
Criar uma nova rota/funcionalidade no CRM Enel para importar arquivos .xlsm de PCR
e cadastrar automaticamente um projeto com os dados extraídos do Resumo ITL.

## Mapeamento de campos (aba "Resumo ITL")

| Campo no CRM     | Linha/Coluna no Excel | Observação                  |
|------------------|-----------------------|-----------------------------|
| BR               | L29, coluna C         | Ex: "BR 22461.428"          |
| Oportunidade     | L30, coluna C         | Nome do projeto             |
| Status           | Fixo                  | Sempre "Not Forecastable"   |
| CF               | Fixo                  | Sempre 0.29                 |
| FOB              | L49, coluna N         | Custo Total                 |
| Margem           | L49, coluna O         | Margem final em %           |
| Valor Líquido    | L49, coluna P         | Líquido                     |
| Valor Bruto      | L49, coluna R         | DDP                         |

## Regras
- Ler APENAS a aba "Resumo ITL", ignorar todas as outras
- O BR vem como "BR 22461.428" — extrair apenas o número (22461.428)
- O nome do projeto vem como "Projeto: SFPs Fortinet..." — limpar o prefixo
- Margem já vem como decimal (0.26), converter para % na exibição
- Regional deve ser inferida do nome do projeto (ex: "Enel RJ" → "Enel RJ")

## Como implementar
1. Nova rota no backend: POST /api/import-pcr (recebe o .xlsm)
2. Parser usando openpyxl (Python) ou xlsx (Node) para ler a aba Resumo ITL
3. No frontend: novo botão "Importar PCR" na página de importação existente
4. Após importar, redirecionar para o projeto criado