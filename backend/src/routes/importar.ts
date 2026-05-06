import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDb } from '../database';
import { MESES } from '../types';

const router = Router();
const upload = multer({ dest: path.join(__dirname, '../../uploads/') });

const VALID_STATUSES = new Set(['Closed Win', 'Commit', 'Upside', 'Not Forecastable', 'Closed Lost']);

function safeFloat(v: unknown): number {
  const n = parseFloat(String(v));
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}

function safeStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(v);
  return String(v).trim();
}

function safeBr(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return v.toFixed(3);
  const s = String(v).trim();
  const n = parseFloat(s);
  if (!isNaN(n) && /^[\d.]+$/.test(s)) return n.toFixed(3);
  return s;
}

function normStatus(s: string): string {
  const map: Record<string, string> = {
    'closed win': 'Closed Win', 'commit': 'Commit', 'upside': 'Upside',
    'not forecastable': 'Not Forecastable', 'closed lost': 'Closed Lost',
  };
  return map[s.toLowerCase()] || s;
}

function extractPipelineSheet(rows: unknown[][], contrato: 'Open Network' | 'Power Network') {
  const projects: Record<string, unknown>[] = [];
  let inData = false;
  for (const row of rows) {
    if (row[1] === 'STATUS') { inData = true; continue; }
    if (!inData) continue;
    const raw = safeStr(row[1]);
    const status = normStatus(raw);
    if (!VALID_STATUSES.has(status)) continue;
    const oportunidade = safeStr(row[6]);
    if (!oportunidade) continue;
    projects.push({
      contrato, status,
      br: safeBr(row[2]), cf: safeFloat(row[3]),
      regional: safeStr(row[4]), did: safeStr(row[5]),
      oportunidade,
      valor_liq: safeFloat(row[7]), valor_bruto: safeFloat(row[8]),
      po_pendente: safeFloat(row[9]), fob: safeFloat(row[10]),
      solicitante: safeStr(row[12]), status_compra: safeStr(row[14]),
      status_po: safeStr(row[15]),
      margem1: safeFloat(row[18]), margem2: safeFloat(row[19]),
    });
  }
  return projects;
}

// Months start at col 13, each block is 8 cols wide, revenues at offset +2
const MONTH_BASE_COLS: Record<string, number> = {};
MESES.forEach((m, i) => { MONTH_BASE_COLS[m] = 13 + i * 8; });

function extractForecastSheet(rows: unknown[][]) {
  const forecast: Record<string, Record<string, number>> = {};
  for (let ri = 4; ri < rows.length; ri++) {
    const row = rows[ri];
    const br = safeStr(row[1]);
    const oportunidade = safeStr(row[2]);
    if (!br || !oportunidade) continue;
    const valorLiq = row[3];
    if (typeof valorLiq !== 'number') continue;

    const key = `${br}::${oportunidade}`;
    forecast[key] = {};
    for (const mes of MESES) {
      const revCol = MONTH_BASE_COLS[mes] + 2;
      const val = row[revCol];
      forecast[key][mes] = typeof val === 'number' ? Math.round(val * 100) / 100 : 0;
    }
  }
  return forecast;
}

// POST /api/import
router.post('/', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require('xlsx') as typeof import('xlsx');
    const wb = XLSX.readFile(req.file.path, { cellDates: true, dense: true });
    fs.unlinkSync(req.file.path);

    const getRows = (name: string): unknown[][] => {
      const ws = wb.Sheets[name];
      if (!ws) return [];
      return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as unknown[][];
    };

    const onRows = getRows('OPEN NET - Forecast Details');
    const pnRows = getRows('POWER NET - Forecast Details');
    const fyRows = getRows('Forecast Full Year');

    const onProjects = extractPipelineSheet(onRows, 'Open Network');
    const pnProjects = extractPipelineSheet(pnRows, 'Power Network');
    const allProjects = [...onProjects, ...pnProjects];

    const forecast = extractForecastSheet(fyRows);

    const db = getDb();
    const mode = req.body.mode || 'replace'; // 'replace' | 'merge'

    let inserted = 0;
    let updated = 0;

    const insertP = db.prepare(`
      INSERT INTO projetos (contrato, status, regional, br, did, oportunidade, cf,
        valor_liq, valor_bruto, po_pendente, fob, solicitante, status_compra, status_po, margem1, margem2)
      VALUES (@contrato, @status, @regional, @br, @did, @oportunidade, @cf,
        @valor_liq, @valor_bruto, @po_pendente, @fob, @solicitante, @status_compra, @status_po, @margem1, @margem2)
    `);

    const selectP = db.prepare(
      `SELECT id FROM projetos WHERE br = ? AND oportunidade = ? AND contrato = ?`
    );

    const updateP = db.prepare(`
      UPDATE projetos SET status=@status, regional=@regional, cf=@cf,
        valor_liq=@valor_liq, valor_bruto=@valor_bruto, po_pendente=@po_pendente,
        fob=@fob, solicitante=@solicitante, status_compra=@status_compra,
        status_po=@status_po, margem1=@margem1, margem2=@margem2,
        updated_at=datetime('now')
      WHERE id=@id
    `);

    const insertF = db.prepare(`
      INSERT OR REPLACE INTO forecast_mensal (projeto_id, mes, revenues)
      VALUES (?, ?, ?)
    `);

    const deleteForecast = db.prepare(`DELETE FROM forecast_mensal`);
    const deleteProjetos = db.prepare(`DELETE FROM projetos`);

    const upsert = db.transaction((projects: Record<string, unknown>[]) => {
      if (mode === 'replace') {
        deleteForecast.run();
        deleteProjetos.run();
      }

      for (const p of projects) {
        const existing = selectP.get(p.br, p.oportunidade, p.contrato) as { id: number } | undefined;

        let projetoId: number;

        if (existing) {
          updateP.run({ ...p, id: existing.id });
          projetoId = existing.id;
          updated++;
        } else {
          const r = insertP.run(p);
          projetoId = Number(r.lastInsertRowid);
          inserted++;
        }

        // Attach forecast
        const key = `${p.br}::${p.oportunidade}`;
        const fData = forecast[key];
        if (fData) {
          for (const mes of MESES) {
            insertF.run(projetoId, mes, fData[mes] || 0);
          }
        }
      }
    });

    upsert(allProjects);

    res.json({
      success: true,
      inserted,
      updated,
      total: allProjects.length,
      message: `Importação concluída: ${inserted} novos, ${updated} atualizados`,
    });

  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: 'Erro ao processar arquivo', detail: String(err) });
  }
});

export default router;
