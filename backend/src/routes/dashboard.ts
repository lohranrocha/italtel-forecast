import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { QUARTERS, MESES } from '../types';

const router = Router();

// GET /api/dashboard - full summary
router.get('/', (_req: Request, res: Response) => {
  const db = getDb();

  // Totals by regional (Open Network)
  const onByRegional = db.prepare(`
    SELECT regional,
      SUM(CASE WHEN status != 'Closed Lost' THEN valor_liq ELSE 0 END) as revenues,
      SUM(CASE WHEN status IN ('Closed Win','Commit') THEN valor_liq ELSE 0 END) as bookings,
      SUM(margem1 * CASE WHEN status != 'Closed Lost' THEN valor_liq ELSE 0 END) / NULLIF(SUM(CASE WHEN status != 'Closed Lost' THEN valor_liq ELSE 0 END), 0) as margem1_weighted,
      SUM(margem2 * CASE WHEN status != 'Closed Lost' THEN valor_liq ELSE 0 END) / NULLIF(SUM(CASE WHEN status != 'Closed Lost' THEN valor_liq ELSE 0 END), 0) as margem2_weighted,
      COUNT(*) as total_projetos
    FROM projetos WHERE contrato = 'Open Network'
    GROUP BY regional ORDER BY regional
  `).all();

  // Power Network total
  const pnTotal = db.prepare(`
    SELECT
      SUM(CASE WHEN status != 'Closed Lost' THEN valor_liq ELSE 0 END) as revenues,
      SUM(CASE WHEN status = 'Closed Win' THEN valor_liq ELSE 0 END) as closed_win,
      SUM(margem1 * CASE WHEN status != 'Closed Lost' THEN valor_liq ELSE 0 END) / NULLIF(SUM(CASE WHEN status != 'Closed Lost' THEN valor_liq ELSE 0 END), 0) as margem1_weighted,
      SUM(margem2 * CASE WHEN status != 'Closed Lost' THEN valor_liq ELSE 0 END) / NULLIF(SUM(CASE WHEN status != 'Closed Lost' THEN valor_liq ELSE 0 END), 0) as margem2_weighted
    FROM projetos WHERE contrato = 'Power Network'
  `).get() as { revenues: number; closed_win: number; margem1_weighted: number; margem2_weighted: number };

  // Grand totals
  const grandTotal = db.prepare(`
    SELECT
      SUM(CASE WHEN status != 'Closed Lost' THEN valor_liq ELSE 0 END) as total_liq,
      SUM(CASE WHEN status = 'Closed Win' THEN valor_liq ELSE 0 END) as closed_win,
      SUM(CASE WHEN status = 'Commit' THEN valor_liq ELSE 0 END) as total_commit,
      SUM(CASE WHEN status = 'Upside' THEN valor_liq ELSE 0 END) as upside,
      SUM(CASE WHEN status = 'Not Forecastable' THEN valor_liq ELSE 0 END) as not_forecastable,
      SUM(CASE WHEN status = 'Closed Lost' THEN valor_liq ELSE 0 END) as closed_lost,
      SUM(margem1 * CASE WHEN status != 'Closed Lost' THEN valor_liq ELSE 0 END) / NULLIF(SUM(CASE WHEN status != 'Closed Lost' THEN valor_liq ELSE 0 END), 0) as margem1_weighted,
      SUM(margem2 * CASE WHEN status != 'Closed Lost' THEN valor_liq ELSE 0 END) / NULLIF(SUM(CASE WHEN status != 'Closed Lost' THEN valor_liq ELSE 0 END), 0) as margem2_weighted
    FROM projetos
  `).get();

  // Metas
  const metas = db.prepare(`SELECT * FROM metas WHERE ano = 2026`).all();

  // Forecast por quarter (agregado)
  const forecastByMonth = db.prepare(`
    SELECT f.mes, 
      SUM(f.revenues) as revenues,
      SUM(f.bookings) as bookings,
      p.contrato
    FROM forecast_mensal f
    JOIN projetos p ON p.id = f.projeto_id
    GROUP BY f.mes, p.contrato
    ORDER BY f.mes
  `).all() as { mes: string; revenues: number; bookings: number; contrato: string }[];

  // Build quarter summary
  const quarterSummary = Object.entries(QUARTERS).map(([q, months]) => {
    const onRevs = months.reduce((acc, m) => {
      const row = forecastByMonth.find(r => r.mes === m && r.contrato === 'Open Network');
      return acc + (row?.revenues || 0);
    }, 0);
    const pnRevs = months.reduce((acc, m) => {
      const row = forecastByMonth.find(r => r.mes === m && r.contrato === 'Power Network');
      return acc + (row?.revenues || 0);
    }, 0);
    return { quarter: q, openNetwork: onRevs, powerNetwork: pnRevs, total: onRevs + pnRevs };
  });

  // Monthly for chart
  const monthlyChart = MESES.map(mes => {
    const on = forecastByMonth.find(r => r.mes === mes && r.contrato === 'Open Network');
    const pn = forecastByMonth.find(r => r.mes === mes && r.contrato === 'Power Network');
    return {
      mes,
      openNetwork: on?.revenues || 0,
      powerNetwork: pn?.revenues || 0,
      total: (on?.revenues || 0) + (pn?.revenues || 0),
    };
  });

  // Status breakdown
  const statusBreakdown = db.prepare(`
    SELECT status, contrato, COUNT(*) as count, SUM(valor_liq) as valor
    FROM projetos GROUP BY status, contrato ORDER BY contrato, status
  `).all();

  res.json({
    openNetwork: { byRegional: onByRegional },
    powerNetwork: pnTotal,
    grandTotal,
    metas,
    quarterSummary,
    monthlyChart,
    statusBreakdown,
  });
});

// GET /api/dashboard/regionais - per-regional detail for Dashboard Resume
router.get('/regionais', (_req: Request, res: Response) => {
  const db = getDb();

  const totalsRows = db.prepare(`
    SELECT
      regional,
      SUM(valor_liq) as revenues,
      SUM(margem2 * valor_liq) / NULLIF(SUM(valor_liq),0) as margem2_weighted,
      SUM(CASE WHEN status IN ('Closed Win','Commit') THEN valor_liq ELSE 0 END) as bookings
    FROM projetos WHERE contrato = 'Open Network'
    GROUP BY regional ORDER BY regional
  `).all() as { regional: string; revenues: number; margem2_weighted: number; bookings: number }[];

  const forecastRows = db.prepare(`
    SELECT p.regional, f.mes, SUM(f.revenues) as revenues
    FROM forecast_mensal f
    JOIN projetos p ON p.id = f.projeto_id
    WHERE p.contrato = 'Open Network'
    GROUP BY p.regional, f.mes
  `).all() as { regional: string; mes: string; revenues: number }[];

  const result = totalsRows.map(totals => {
    const regional = totals.regional;
    const regionForecast = forecastRows.filter(r => r.regional === regional);

    const qRevs = Object.entries(QUARTERS).reduce((acc, [q, months]) => {
      acc[q] = months.reduce((s, m) => s + (regionForecast.find(r => r.mes === m)?.revenues || 0), 0);
      return acc;
    }, {} as Record<string, number>);

    return { ...totals, ...qRevs };
  });

  res.json(result);
});

export default router;
