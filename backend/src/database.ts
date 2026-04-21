import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '../../data/enel_crm.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projetos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contrato TEXT NOT NULL CHECK(contrato IN ('Open Network', 'Power Network')),
      status TEXT NOT NULL CHECK(status IN ('Closed Win', 'Commit', 'Upside', 'Not Forecastable', 'Closed Lost')),
      regional TEXT NOT NULL,
      br TEXT,
      did TEXT,
      oportunidade TEXT NOT NULL,
      cf REAL DEFAULT 0,
      valor_liq REAL DEFAULT 0,
      valor_bruto REAL DEFAULT 0,
      po_pendente REAL DEFAULT 0,
      fob REAL DEFAULT 0,
      solicitante TEXT,
      status_compra TEXT,
      status_po TEXT,
      margem1 REAL DEFAULT 0,
      margem2 REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS forecast_mensal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      projeto_id INTEGER NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
      mes TEXT NOT NULL,
      revenues REAL DEFAULT 0,
      bookings REAL DEFAULT 0,
      invoices REAL DEFAULT 0,
      margem1 REAL DEFAULT 0,
      margem2 REAL DEFAULT 0,
      UNIQUE(projeto_id, mes)
    );

    CREATE TABLE IF NOT EXISTS metas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ano INTEGER NOT NULL,
      contrato TEXT NOT NULL,
      target_ano REAL DEFAULT 0,
      UNIQUE(ano, contrato)
    );

    CREATE INDEX IF NOT EXISTS idx_projetos_contrato ON projetos(contrato);
    CREATE INDEX IF NOT EXISTS idx_projetos_regional ON projetos(regional);
    CREATE INDEX IF NOT EXISTS idx_projetos_status ON projetos(status);
    CREATE INDEX IF NOT EXISTS idx_forecast_projeto ON forecast_mensal(projeto_id);
  `);

  // Insert default targets if not exist
  const stmt = db.prepare(`INSERT OR IGNORE INTO metas (ano, contrato, target_ano) VALUES (?, ?, ?)`);
  stmt.run(2026, 'Total', 66989000);
}
