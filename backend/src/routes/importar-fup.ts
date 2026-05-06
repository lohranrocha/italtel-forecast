import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDb } from '../database';
import { MESES } from '../types';

const router = Router();
const upload = multer({ dest: path.join(__dirname, '../../uploads/') });

// Column indices (0-based)
const REV_START = 39; // AN → Jan
const M1_START  = 52; // BA → Jan (margem 1)
const M2_START  = 65; // BN → Jan (margem 2)

function safeFloat(v: unknown): number {
  const n = parseFloat(String(v ?? ''));
  return isNaN(n) ? 0 : n;
}

function extractBr(v: unknown): string | null {
  const match = String(v ?? '').match(/22461\.\d+/);
  return match ? match[0] : null;
}

function normBr(br: string): string {
  const n = parseFloat(br);
  return isNaN(n) ? br : n.toFixed(3);
}

type BrAgg = { revenues: number[]; margem1: number[]; margem2: number[] };
type RawSourceRow = { rowNum: number; colA: string; rev: (number|null)[]; m1: (number|null)[]; m2: (number|null)[] };

function parseFile(filePath: string) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx') as typeof import('xlsx');
  const wb = XLSX.readFile(filePath, { cellDates: true, dense: true });

  const ws = wb.Sheets['Foglio Estero'];
  if (!ws) throw new Error('Aba "Foglio Estero" não encontrada no arquivo');

  const sheetRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as unknown[][];

  const agg = new Map<string, BrAgg>();
  const rawByBr = new Map<string, RawSourceRow[]>();

  for (let ri = 0; ri < sheetRows.length; ri++) {
    const row = sheetRows[ri];
    const br = extractBr(row[0]);
    if (!br) continue;

    const key = normBr(br);
    if (!agg.has(key)) {
      agg.set(key, { revenues: Array(12).fill(0), margem1: Array(12).fill(0), margem2: Array(12).fill(0) });
      rawByBr.set(key, []);
    }

    const entry = agg.get(key)!;
    for (let i = 0; i < 12; i++) {
      entry.revenues[i] += safeFloat(row[REV_START + i]);
      entry.margem1[i]  += safeFloat(row[M1_START  + i]);
      entry.margem2[i]  += safeFloat(row[M2_START  + i]);
    }

    rawByBr.get(key)!.push({
      rowNum: ri + 1,
      colA:   String(row[0] ?? ''),
      rev: Array.from({ length: 12 }, (_, i) => { const v = row[REV_START + i]; return (v != null && v !== '') ? safeFloat(v) : null; }),
      m1:  Array.from({ length: 12 }, (_, i) => { const v = row[M1_START  + i]; return (v != null && v !== '') ? safeFloat(v) : null; }),
      m2:  Array.from({ length: 12 }, (_, i) => { const v = row[M2_START  + i]; return (v != null && v !== '') ? safeFloat(v) : null; }),
    });
  }

  return { agg, rawByBr };
}

// POST /api/import-fup/preview — processa o arquivo e retorna os dados SEM salvar
router.post('/preview', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

  try {
    const { agg, rawByBr } = parseFile(req.file.path);
    fs.unlinkSync(req.file.path);

    if (agg.size === 0) {
      return res.status(400).json({ error: 'Nenhum BR do Open Network (22461.xxx) encontrado no arquivo' });
    }

    const db = getDb();
    const allON = db.prepare(
      `SELECT id, br, oportunidade FROM projetos WHERE contrato = 'Open Network'`
    ).all() as { id: number; br: string; oportunidade: string }[];

    const brMap = new Map<string, { id: number; oportunidade: string }>();
    for (const p of allON) brMap.set(normBr(p.br), { id: p.id, oportunidade: p.oportunidade });

    const previewRows = [];
    for (const [brNorm, data] of agg) {
      const projeto = brMap.get(brNorm);
      const totalRev = data.revenues.reduce((s, v) => s + v, 0);
      const totalM1  = data.margem1.reduce((s, v) => s + v, 0);
      const totalM2  = data.margem2.reduce((s, v) => s + v, 0);

      previewRows.push({
        br:           brNorm,
        oportunidade: projeto?.oportunidade ?? null,
        matched:      !!projeto,
        revenues:     data.revenues,
        margem1_abs:  totalM1,
        margem2_abs:  totalM2,
        total_rev:    totalRev,
        margem1_pct:  totalRev > 0 ? totalM1 / totalRev : 0,
        margem2_pct:  totalRev > 0 ? totalM2 / totalRev : 0,
        _raw:         rawByBr.get(brNorm) ?? [],
      });
    }

    res.json({ success: true, rows: previewRows, meses: MESES });

  } catch (err) {
    console.error('FUP preview error:', err);
    res.status(500).json({ error: 'Erro ao processar arquivo FUP', detail: String(err) });
  }
});

// POST /api/import-fup — salva os dados no banco
router.post('/', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

  try {
    const { agg } = parseFile(req.file.path);
    fs.unlinkSync(req.file.path);

    if (agg.size === 0) {
      return res.status(400).json({ error: 'Nenhum BR do Open Network (22461.xxx) encontrado no arquivo' });
    }

    const db = getDb();

    const allON = db.prepare(
      `SELECT id, br FROM projetos WHERE contrato = 'Open Network'`
    ).all() as { id: number; br: string }[];

    const brMap = new Map<string, number>();
    for (const p of allON) brMap.set(normBr(p.br), p.id);

    const updateP = db.prepare(`
      UPDATE projetos
      SET valor_liq = @valor_liq, margem1 = @margem1, margem2 = @margem2,
          updated_at = datetime('now')
      WHERE id = @id
    `);

    const upsertF = db.prepare(`
      INSERT INTO forecast_mensal (projeto_id, mes, revenues, margem1, margem2)
      VALUES (@projeto_id, @mes, @revenues, @margem1, @margem2)
      ON CONFLICT(projeto_id, mes) DO UPDATE SET
        revenues = excluded.revenues,
        margem1  = excluded.margem1,
        margem2  = excluded.margem2
    `);

    const updated: string[]  = [];
    const notFound: string[] = [];

    db.transaction(() => {
      for (const [brNorm, data] of agg) {
        const projetoId = brMap.get(brNorm);
        if (!projetoId) { notFound.push(brNorm); continue; }

        const totalRev = data.revenues.reduce((s, v) => s + v, 0);
        const totalM1  = data.margem1.reduce((s, v) => s + v, 0);
        const totalM2  = data.margem2.reduce((s, v) => s + v, 0);

        updateP.run({
          id: projetoId,
          valor_liq: totalRev,
          margem1: totalRev > 0 ? totalM1 / totalRev : 0,
          margem2: totalRev > 0 ? totalM2 / totalRev : 0,
        });

        for (let i = 0; i < 12; i++) {
          const rev = data.revenues[i];
          const m1  = data.margem1[i];
          const m2  = data.margem2[i];
          upsertF.run({
            projeto_id: projetoId,
            mes:        MESES[i],
            revenues:   rev,
            margem1:    rev > 0 ? m1 / rev : 0,
            margem2:    rev > 0 ? m2 / rev : 0,
          });
        }

        updated.push(brNorm);
      }
    })();

    res.json({
      success: true,
      updated: updated.length,
      not_found: notFound.length,
      not_found_brs: notFound,
      message: `${updated.length} projeto(s) atualizado(s)${notFound.length > 0 ? `, ${notFound.length} BR(s) não encontrado(s)` : ''}`,
    });

  } catch (err) {
    console.error('Import FUP error:', err);
    res.status(500).json({ error: 'Erro ao processar arquivo FUP', detail: String(err) });
  }
});

export default router;
