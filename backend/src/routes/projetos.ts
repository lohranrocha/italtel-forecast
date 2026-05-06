import { Router, Request, Response } from 'express';
import { getDb } from '../database';
import { MESES } from '../types';

const router = Router();

// GET /api/projetos - list with filters
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const { contrato, regional, status, search } = req.query;

  let sql = `SELECT p.*, 
    (SELECT SUM(f.revenues) FROM forecast_mensal f WHERE f.projeto_id = p.id) as total_revenues
    FROM projetos p WHERE 1=1`;
  const params: unknown[] = [];

  if (contrato) { sql += ` AND p.contrato = ?`; params.push(contrato); }
  if (regional) { sql += ` AND p.regional = ?`; params.push(regional); }
  if (status) { sql += ` AND p.status = ?`; params.push(status); }
  if (search) {
    sql += ` AND (p.oportunidade LIKE ? OR p.br LIKE ? OR p.solicitante LIKE ?)`;
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  sql += ` ORDER BY p.contrato, p.regional, p.oportunidade`;
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// GET /api/projetos/:id
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const projeto = db.prepare(`SELECT * FROM projetos WHERE id = ?`).get(req.params.id);
  if (!projeto) return res.status(404).json({ error: 'Projeto não encontrado' });

  const forecast = db.prepare(
    `SELECT * FROM forecast_mensal WHERE projeto_id = ? ORDER BY mes`
  ).all(req.params.id);

  res.json({ ...projeto as object, forecast });
});

// POST /api/projetos
router.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const {
    contrato, status, regional, br, did, oportunidade, cf,
    valor_liq, valor_bruto, po_pendente, fob, solicitante,
    solicitante_cargo, solicitante_telefone, solicitante_email,
    status_compra, status_po, margem1, margem2, forecast
  } = req.body;

  if (!contrato || !status || !regional || !oportunidade) {
    return res.status(400).json({ error: 'Campos obrigatórios: contrato, status, regional, oportunidade' });
  }

  const insertProjeto = db.prepare(`
    INSERT INTO projetos (contrato, status, regional, br, did, oportunidade, cf,
      valor_liq, valor_bruto, po_pendente, fob, solicitante,
      solicitante_cargo, solicitante_telefone, solicitante_email,
      status_compra, status_po, margem1, margem2)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = insertProjeto.run(
    contrato, status, regional, br || '', did || '', oportunidade, cf || 0,
    valor_liq || 0, valor_bruto || 0, po_pendente || 0, fob || 0,
    solicitante || '', solicitante_cargo || '', solicitante_telefone || '', solicitante_email || '',
    status_compra || '', status_po || '', margem1 || 0, margem2 || 0
  );

  const projetoId = result.lastInsertRowid;

  if (forecast && typeof forecast === 'object') {
    const insertForecast = db.prepare(`
      INSERT OR REPLACE INTO forecast_mensal (projeto_id, mes, revenues, bookings, invoices, margem1, margem2)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const mes of MESES) {
      const m = (forecast as Record<string, { revenues?: number; bookings?: number; invoices?: number; margem1?: number; margem2?: number }>)[mes];
      if (m) {
        insertForecast.run(projetoId, mes, m.revenues || 0, m.bookings || 0, m.invoices || 0, m.margem1 || 0, m.margem2 || 0);
      }
    }
  }

  const created = db.prepare(`SELECT * FROM projetos WHERE id = ?`).get(projetoId);
  res.status(201).json(created);
});

// PUT /api/projetos/:id
router.put('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const { id } = req.params;
  const existing = db.prepare(`SELECT id FROM projetos WHERE id = ?`).get(id);
  if (!existing) return res.status(404).json({ error: 'Projeto não encontrado' });

  const {
    contrato, status, regional, br, did, oportunidade, cf,
    valor_liq, valor_bruto, po_pendente, fob, solicitante,
    solicitante_cargo, solicitante_telefone, solicitante_email,
    status_compra, status_po, margem1, margem2, forecast
  } = req.body;

  db.prepare(`
    UPDATE projetos SET
      contrato=?, status=?, regional=?, br=?, did=?, oportunidade=?, cf=?,
      valor_liq=?, valor_bruto=?, po_pendente=?, fob=?, solicitante=?,
      solicitante_cargo=?, solicitante_telefone=?, solicitante_email=?,
      status_compra=?, status_po=?, margem1=?, margem2=?,
      updated_at=datetime('now')
    WHERE id=?
  `).run(
    contrato, status, regional, br || '', did || '', oportunidade, cf || 0,
    valor_liq || 0, valor_bruto || 0, po_pendente || 0, fob || 0,
    solicitante || '', solicitante_cargo || '', solicitante_telefone || '', solicitante_email || '',
    status_compra || '', status_po || '', margem1 || 0, margem2 || 0, id
  );

  if (forecast && typeof forecast === 'object') {
    db.prepare(`DELETE FROM forecast_mensal WHERE projeto_id = ?`).run(id);
    const insertForecast = db.prepare(`
      INSERT INTO forecast_mensal (projeto_id, mes, revenues, bookings, invoices, margem1, margem2)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const mes of MESES) {
      const m = (forecast as Record<string, { revenues?: number; bookings?: number; invoices?: number; margem1?: number; margem2?: number }>)[mes];
      if (m) {
        insertForecast.run(id, mes, m.revenues || 0, m.bookings || 0, m.invoices || 0, m.margem1 || 0, m.margem2 || 0);
      }
    }
  }

  const updated = db.prepare(`SELECT * FROM projetos WHERE id = ?`).get(id);
  res.json(updated);
});

// DELETE /api/projetos/:id
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const result = db.prepare(`DELETE FROM projetos WHERE id = ?`).run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Projeto não encontrado' });
  res.json({ success: true });
});

export default router;
