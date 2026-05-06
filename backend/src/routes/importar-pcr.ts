import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDb } from '../database';

const router = Router();
const upload = multer({ dest: path.join(__dirname, '../../uploads/') });

function safeFloat(v: unknown): number {
  const n = parseFloat(String(v));
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}

function safeStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function inferRegional(oportunidade: string): string {
  const u = oportunidade.toUpperCase();
  if (u.includes('ENEL EGP') || u.includes(' EGP')) return 'Enel EGP';
  if (u.includes('ENEL X')) return 'Enel X';
  if (u.includes('ENEL RJ') || u.includes(' RJ')) return 'Enel RJ';
  if (u.includes('ENEL SP') || u.includes(' SP')) return 'Enel SP';
  if (u.includes('ENEL CE') || u.includes(' CE')) return 'Enel CE';
  return 'Enel RJ';
}

// POST /api/import-pcr
router.post('/', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require('xlsx') as typeof import('xlsx');
    const wb = XLSX.readFile(req.file.path, { cellDates: true, dense: true });
    fs.unlinkSync(req.file.path);

    const ws = wb.Sheets['Resumo ITL'];
    if (!ws) {
      return res.status(400).json({ error: 'Aba "Resumo ITL" não encontrada no arquivo' });
    }

    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as unknown[][];

    // Row indices: Excel row N = array index N-1
    const brRaw = safeStr(rows[28]?.[2]);       // Linha 29, coluna C
    const oportunidadeRaw = safeStr(rows[29]?.[2]); // Linha 30, coluna C
    const fob = safeFloat(rows[48]?.[13]);      // Linha 49, coluna N
    const margem = safeFloat(rows[48]?.[14]);   // Linha 49, coluna O
    const valorLiq = safeFloat(rows[48]?.[15]); // Linha 49, coluna P
    const valorBruto = safeFloat(rows[48]?.[17]); // Linha 49, coluna R

    // "BR 22461.428" → "22461.428" (always 3 decimal places)
    const brMatch = brRaw.match(/[\d.]+/);
    const brNum = brMatch ? parseFloat(brMatch[0]) : NaN;
    const br = !isNaN(brNum) ? brNum.toFixed(3) : brRaw;

    // "Projeto: SFPs Fortinet..." → "SFPs Fortinet..."
    const oportunidade = oportunidadeRaw.replace(/^Projeto:\s*/i, '').trim();

    if (!oportunidade) {
      return res.status(400).json({ error: 'Nome da oportunidade não encontrado na linha 30, coluna C' });
    }

    const regional = inferRegional(oportunidade);
    const contrato = (req.body.contrato as string) || 'Open Network';

    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO projetos (contrato, status, regional, br, did, oportunidade, cf,
        valor_liq, valor_bruto, po_pendente, fob, solicitante, status_compra, status_po, margem1, margem2)
      VALUES (@contrato, @status, @regional, @br, @did, @oportunidade, @cf,
        @valor_liq, @valor_bruto, @po_pendente, @fob, @solicitante, @status_compra, @status_po, @margem1, @margem2)
    `);

    const result = stmt.run({
      contrato,
      status: 'Not Forecastable',
      regional,
      br,
      did: '',
      oportunidade,
      cf: 0.29,
      valor_liq: valorLiq,
      valor_bruto: valorBruto,
      po_pendente: 0,
      fob,
      solicitante: '',
      status_compra: '',
      status_po: '',
      margem1: margem,
      margem2: margem,
    });

    res.json({
      success: true,
      projeto_id: Number(result.lastInsertRowid),
      br,
      oportunidade,
      regional,
      contrato,
      fob,
      margem,
      valor_liq: valorLiq,
      valor_bruto: valorBruto,
      message: `Projeto "${oportunidade}" importado com sucesso`,
    });

  } catch (err) {
    console.error('Import PCR error:', err);
    res.status(500).json({ error: 'Erro ao processar arquivo PCR', detail: String(err) });
  }
});

export default router;
