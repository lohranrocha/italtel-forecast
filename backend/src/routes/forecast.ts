import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { QUARTERS, MESES } from '../types';

const router = Router();

// GET /api/forecast?contrato=&regional=
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const { contrato, regional } = req.query;

  let sql = `
    SELECT p.id, p.br, p.oportunidade, p.regional, p.contrato, p.status,
           p.valor_liq, p.cf, p.margem2,
           f.mes, f.revenues, f.bookings, f.invoices
    FROM projetos p
    LEFT JOIN forecast_mensal f ON f.projeto_id = p.id
    WHERE 1=1
  `;
  const params: unknown[] = [];
  if (contrato) { sql += ` AND p.contrato = ?`; params.push(contrato); }
  if (regional) { sql += ` AND p.regional = ?`; params.push(regional); }
  sql += ` ORDER BY p.regional, p.oportunidade, f.mes`;

  const rows = db.prepare(sql).all(...params) as {
    id: number; br: string; oportunidade: string; regional: string;
    contrato: string; status: string; valor_liq: number; cf: number; margem2: number;
    mes: string | null; revenues: number | null;
  }[];

  // Group by project
  const projectMap = new Map<number, {
    id: number; br: string; oportunidade: string; regional: string;
    contrato: string; status: string; valor_liq: number; cf: number; margem2: number;
    monthly: Record<string, number>;
    quarters: Record<string, number>;
    total: number;
  }>();

  for (const row of rows) {
    if (!projectMap.has(row.id)) {
      projectMap.set(row.id, {
        id: row.id, br: row.br, oportunidade: row.oportunidade,
        regional: row.regional, contrato: row.contrato, status: row.status,
        valor_liq: row.valor_liq, cf: row.cf, margem2: row.margem2,
        monthly: Object.fromEntries(MESES.map(m => [m, 0])),
        quarters: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
        total: 0,
      });
    }
    if (row.mes && row.revenues != null) {
      const p = projectMap.get(row.id)!;
      p.monthly[row.mes] = row.revenues;
      p.total += row.revenues;
      for (const [q, months] of Object.entries(QUARTERS)) {
        if ((months as string[]).includes(row.mes)) {
          p.quarters[q] += row.revenues;
        }
      }
    }
  }

  // Quarter + month aggregated totals by regional
  const byRegional = new Map<string, Record<string, number>>();
  // Track weighted margin accumulators separately
  const byRegionalMargemNum = new Map<string, number>(); // sum(margem2 * valor_liq)
  const byRegionalMargemDen = new Map<string, number>(); // sum(valor_liq)

  for (const p of projectMap.values()) {
    if (!byRegional.has(p.regional)) {
      byRegional.set(p.regional, Object.fromEntries(
        [...MESES, 'Q1', 'Q2', 'Q3', 'Q4', 'Total'].map(k => [k, 0])
      ));
      byRegionalMargemNum.set(p.regional, 0);
      byRegionalMargemDen.set(p.regional, 0);
    }
    const agg = byRegional.get(p.regional)!;
    for (const m of MESES) agg[m] += p.monthly[m];
    for (const q of ['Q1', 'Q2', 'Q3', 'Q4']) agg[q] += p.quarters[q];
    agg['Total'] += p.total;
    byRegionalMargemNum.set(p.regional, (byRegionalMargemNum.get(p.regional) || 0) + p.margem2 * p.valor_liq);
    byRegionalMargemDen.set(p.regional, (byRegionalMargemDen.get(p.regional) || 0) + p.valor_liq);
  }

  // Inject weighted margin into each regional record
  for (const [reg, agg] of byRegional) {
    const den = byRegionalMargemDen.get(reg) || 0;
    agg['margem2_weighted'] = den > 0 ? (byRegionalMargemNum.get(reg) || 0) / den : 0;
  }

  res.json({
    projetos: Array.from(projectMap.values()),
    byRegional: Object.fromEntries(byRegional),
  });
});

export default router;
