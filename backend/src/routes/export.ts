import { Router, Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { getDb } from '../database';
import { QUARTERS } from '../types';

const router = Router();
const Q_LIST = ['Q1', 'Q2', 'Q3', 'Q4'] as const;

// ── Colors ───────────────────────────────────────────────────────────────────
const C = {
  onDark:      '1E3A5F',
  pnDark:      '2D1B5E',
  onMid:       'D6E4F7',
  pnMid:       'E8DEFF',
  headerGray:  'F1F5F9',
  subtotal:    'E2E8F0',
  divider:     '94A3B8',
  white:       'FFFFFF',
  black:       '0F172A',
  q1:          '4F8EF7',
  q2:          '5DC4A5',
  q3:          'EF9F27',
  q4:          'C05ACA',
  red:         'DC2626',
  gray:        '64748B',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtBR(br: string) { const n = parseFloat(br); return isNaN(n) ? br : n.toFixed(3); }
function safeFloat(v: unknown) { const n = parseFloat(String(v ?? '')); return isNaN(n) ? 0 : n; }

function setFill(cell: ExcelJS.Cell, argb: string) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}
function setFont(cell: ExcelJS.Cell, opts: Partial<ExcelJS.Font>) {
  cell.font = { ...cell.font, ...opts };
}
function setAlign(cell: ExcelJS.Cell, h: ExcelJS.Alignment['horizontal'], v: ExcelJS.Alignment['vertical'] = 'middle') {
  cell.alignment = { horizontal: h, vertical: v, wrapText: false };
}
function setBorder(cell: ExcelJS.Cell, style: ExcelJS.BorderStyle = 'thin') {
  const b = { style, color: { argb: 'CBD5E1' } };
  cell.border = { top: b, bottom: b, left: b, right: b };
}

function numFmt(cell: ExcelJS.Cell, value: number) {
  cell.value = value;
  cell.numFmt = '#,##0.00';
}

function buildProjects(contrato: string) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT p.id, p.br, p.oportunidade, p.regional, p.status, p.valor_liq, p.margem2,
           f.mes, f.revenues
    FROM projetos p
    LEFT JOIN forecast_mensal f ON f.projeto_id = p.id
    WHERE p.contrato = ?
    ORDER BY p.regional, p.oportunidade, f.mes
  `).all(contrato) as {
    id: number; br: string; oportunidade: string; regional: string;
    status: string; valor_liq: number; margem2: number;
    mes: string | null; revenues: number | null;
  }[];

  const map = new Map<number, {
    br: string; oportunidade: string; regional: string; status: string;
    valor_liq: number; margem2: number;
    quarters: Record<string, number>; total: number;
  }>();

  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, {
        br: row.br, oportunidade: row.oportunidade, regional: row.regional,
        status: row.status, valor_liq: row.valor_liq, margem2: row.margem2,
        quarters: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }, total: 0,
      });
    }
    if (row.mes && row.revenues != null) {
      const p = map.get(row.id)!;
      const v = safeFloat(row.revenues);
      p.total += v;
      for (const [q, months] of Object.entries(QUARTERS)) {
        if ((months as string[]).includes(row.mes)) p.quarters[q] += v;
      }
    }
  }
  return Array.from(map.values());
}

function calcSummary(projects: ReturnType<typeof buildProjects>) {
  const t: Record<string, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0, Total: 0 };
  let mNum = 0, mDen = 0;
  for (const p of projects) {
    for (const q of Q_LIST) t[q] += p.quarters[q];
    t['Total'] += p.total;
    mNum += p.margem2 * p.valor_liq;
    mDen += p.valor_liq;
  }
  t['Margem'] = mDen > 0 ? mNum / mDen : 0;
  return t;
}

function groupByRegional(projects: ReturnType<typeof buildProjects>) {
  const map: Record<string, typeof projects> = {};
  for (const p of projects) {
    if (!map[p.regional]) map[p.regional] = [];
    map[p.regional].push(p);
  }
  return map;
}

// ── Route ─────────────────────────────────────────────────────────────────────
router.get('/quarters', async (_req: Request, res: Response) => {
  try {
    const onProjects = buildProjects('Open Network');
    const pnProjects = buildProjects('Power Network');
    const allProjects = [...onProjects, ...pnProjects];

    const onSum    = calcSummary(onProjects);
    const pnSum    = calcSummary(pnProjects);
    const grandSum = calcSummary(allProjects);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'CRM Enel';
    const ws = wb.addWorksheet('Detalhamento Quarters', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }],
    });

    // Column definitions
    ws.columns = [
      { key: 'oportunidade', width: 52 },
      { key: 'br',           width: 13 },
      { key: 'status',       width: 20 },
      { key: 'margem',       width: 11 },
      { key: 'q1',           width: 15 },
      { key: 'q2',           width: 15 },
      { key: 'q3',           width: 15 },
      { key: 'q4',           width: 15 },
      { key: 'total',        width: 15 },
    ];

    const date = new Date().toLocaleDateString('pt-BR');
    let r = 0; // current row index (1-based)

    // ── Title ──────────────────────────────────────────────────────
    r++;
    const titleRow = ws.getRow(r);
    ws.mergeCells(`A${r}:I${r}`);
    const titleCell = ws.getCell(`A${r}`);
    titleCell.value = `Detalhamento por Quarters — 2026`;
    setFill(titleCell, C.onDark);
    setFont(titleCell, { bold: true, size: 14, color: { argb: C.white } });
    setAlign(titleCell, 'left');
    titleRow.height = 28;

    r++;
    ws.mergeCells(`A${r}:I${r}`);
    const subCell = ws.getCell(`A${r}`);
    subCell.value = `Exportado em ${date}  ·  Open Network + Power Network`;
    setFill(subCell, C.onDark);
    setFont(subCell, { size: 10, color: { argb: 'A0B4CC' } });
    setAlign(subCell, 'left');
    ws.getRow(r).height = 18;

    r++; // empty
    ws.getRow(r).height = 8;

    // ── Consolidated summary ───────────────────────────────────────
    r++;
    const sumHdrRow = ws.getRow(r);
    sumHdrRow.height = 22;
    ['CONSOLIDADO GERAL', 'Q1', 'Q2', 'Q3', 'Q4', 'TOTAL', '2ª MARGEM', '', ''].forEach((v, i) => {
      const cell = ws.getCell(r, i + 1);
      cell.value = v;
      setFill(cell, C.headerGray);
      setFont(cell, { bold: true, size: 10, color: { argb: C.black } });
      setAlign(cell, i === 0 ? 'left' : 'right');
      setBorder(cell);
    });

    for (const [label, sum, fillColor] of [
      ['Open Network',  onSum,    C.onMid],
      ['Power Network', pnSum,    C.pnMid],
      ['Total Geral',   grandSum, C.subtotal],
    ] as [string, typeof onSum, string][]) {
      r++;
      const row = ws.getRow(r);
      row.height = 20;
      const isBold = label === 'Total Geral';

      const c0 = ws.getCell(r, 1); c0.value = label;
      setFill(c0, fillColor); setFont(c0, { bold: isBold, size: 11 }); setAlign(c0, 'left'); setBorder(c0);

      [sum.Q1, sum.Q2, sum.Q3, sum.Q4, sum.Total].forEach((v, i) => {
        const cell = ws.getCell(r, i + 2);
        numFmt(cell, v);
        setFill(cell, fillColor);
        setFont(cell, { bold: isBold, size: 11 });
        setAlign(cell, 'right');
        setBorder(cell);
      });

      const mCell = ws.getCell(r, 7);
      mCell.value = sum.Margem;
      mCell.numFmt = '0.00%';
      setFill(mCell, fillColor);
      setFont(mCell, { bold: isBold, size: 11 });
      setAlign(mCell, 'right');
      setBorder(mCell);

      [8, 9].forEach(col => { setFill(ws.getCell(r, col), C.white); });
    }

    // ── Contract section helper ────────────────────────────────────
    const addSection = (projects: ReturnType<typeof buildProjects>, label: string, darkColor: string, midColor: string) => {
      r += 2;

      // Contract banner
      ws.mergeCells(`A${r}:I${r}`);
      const banner = ws.getCell(`A${r}`);
      banner.value = label.toUpperCase();
      setFill(banner, darkColor);
      setFont(banner, { bold: true, size: 12, color: { argb: C.white } });
      setAlign(banner, 'left');
      ws.getRow(r).height = 24;

      // Projects column header
      r++;
      ws.getRow(r).height = 20;
      ['Oportunidade', 'BR', 'Status', '2ª Marg.', 'Q1', 'Q2', 'Q3', 'Q4', 'Total'].forEach((v, i) => {
        const cell = ws.getCell(r, i + 1);
        cell.value = v;
        setFill(cell, C.headerGray);
        setFont(cell, { bold: true, size: 10, color: { argb: C.gray } });
        setAlign(cell, i >= 3 ? 'right' : 'left');
        setBorder(cell);
      });

      const byRegional = groupByRegional(projects);

      for (const [regional, projs] of Object.entries(byRegional).sort()) {
        // Regional divider
        r++;
        ws.mergeCells(`A${r}:I${r}`);
        const regDiv = ws.getCell(`A${r}`);
        regDiv.value = `  ${regional}`;
        setFill(regDiv, midColor);
        setFont(regDiv, { bold: true, size: 10, color: { argb: darkColor } });
        setAlign(regDiv, 'left');
        ws.getRow(r).height = 18;

        let regQ1 = 0, regQ2 = 0, regQ3 = 0, regQ4 = 0, regTotal = 0;

        for (const p of projs) {
          r++;
          ws.getRow(r).height = 17;

          const opp = ws.getCell(r, 1);
          opp.value = p.oportunidade;
          setFont(opp, { size: 10 });
          setAlign(opp, 'left');
          setBorder(opp);

          const brCell = ws.getCell(r, 2);
          brCell.value = fmtBR(p.br);
          setFont(brCell, { size: 10, color: { argb: '2563EB' } });
          setAlign(brCell, 'left');
          setBorder(brCell);

          const stCell = ws.getCell(r, 3);
          stCell.value = p.status;
          setFont(stCell, { size: 10, color: { argb: C.gray } });
          setAlign(stCell, 'left');
          setBorder(stCell);

          const mgCell = ws.getCell(r, 4);
          mgCell.value = p.margem2;
          mgCell.numFmt = '0.00%';
          setFont(mgCell, { size: 10 });
          setAlign(mgCell, 'right');
          setBorder(mgCell);

          const qVals = [p.quarters.Q1, p.quarters.Q2, p.quarters.Q3, p.quarters.Q4, p.total];
          qVals.forEach((v, i) => {
            const cell = ws.getCell(r, 5 + i);
            if (v !== 0) { numFmt(cell, v); }
            else { cell.value = null; }
            setFont(cell, { size: 10, color: { argb: v < 0 ? C.red : v > 0 ? C.black : 'CBD5E1' } });
            setAlign(cell, 'right');
            setBorder(cell);
          });

          regQ1 += p.quarters.Q1; regQ2 += p.quarters.Q2;
          regQ3 += p.quarters.Q3; regQ4 += p.quarters.Q4;
          regTotal += p.total;
        }

        // Regional subtotal
        r++;
        ws.getRow(r).height = 18;
        const subLabel = ws.getCell(r, 1);
        subLabel.value = `Subtotal — ${regional}`;
        setFill(subLabel, C.subtotal);
        setFont(subLabel, { bold: true, size: 10 });
        setAlign(subLabel, 'left');
        setBorder(subLabel);

        [ws.getCell(r, 2), ws.getCell(r, 3), ws.getCell(r, 4)].forEach(c => {
          setFill(c, C.subtotal); setBorder(c);
        });

        [regQ1, regQ2, regQ3, regQ4, regTotal].forEach((v, i) => {
          const cell = ws.getCell(r, 5 + i);
          numFmt(cell, v);
          setFill(cell, C.subtotal);
          setFont(cell, { bold: true, size: 10 });
          setAlign(cell, 'right');
          setBorder(cell);
        });
      }
    };

    addSection(onProjects, 'Open Network', C.onDark, C.onMid);
    addSection(pnProjects, 'Power Network', C.pnDark, C.pnMid);

    // ── Send ──────────────────────────────────────────────────────
    const buf = await wb.xlsx.writeBuffer();
    const filename = `detalhamento_quarters_${date.replace(/\//g, '-')}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);

  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Erro ao gerar exportação', detail: String(err) });
  }
});

export default router;
