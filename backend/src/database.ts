import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '../../data/enel_crm.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const t0 = Date.now();
    console.log(`[db] abrindo ${DB_PATH}`);
    db = new Database(DB_PATH);
    console.log(`[db] aberto em ${Date.now() - t0}ms`);

    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('synchronous = NORMAL'); // mais rápido que FULL, seguro em WAL

    // Consolida WAL no .db a cada startup para evitar arquivos db-wal/db-shm
    // crescendo sem limite (sintoma típico quando o processo é morto no meio).
    try {
      const tCk = Date.now();
      const r = db.pragma('wal_checkpoint(TRUNCATE)') as Array<{ busy: number; log: number; checkpointed: number }>;
      console.log(`[db] wal_checkpoint em ${Date.now() - tCk}ms`, r[0]);
    } catch (err) {
      console.warn('[db] wal_checkpoint falhou (seguindo em frente):', err);
    }

    const tSchema = Date.now();
    initSchema(db);
    console.log(`[db] initSchema em ${Date.now() - tSchema}ms`);

    // Garante checkpoint final quando o processo termina normalmente.
    const closeGracefully = () => {
      try {
        db.pragma('wal_checkpoint(TRUNCATE)');
        db.close();
      } catch {
        /* ignore */
      }
      process.exit(0);
    };
    process.on('SIGINT', closeGracefully);
    process.on('SIGTERM', closeGracefully);
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

  // Migrações incrementais para colunas adicionadas após criação inicial
  for (const col of [
    `ALTER TABLE projetos ADD COLUMN solicitante_cargo TEXT DEFAULT ''`,
    `ALTER TABLE projetos ADD COLUMN solicitante_telefone TEXT DEFAULT ''`,
    `ALTER TABLE projetos ADD COLUMN solicitante_email TEXT DEFAULT ''`,
  ]) {
    try { db.exec(col); } catch { /* coluna já existe */ }
  }

  // Insert default targets if not exist
  const stmt = db.prepare(`INSERT OR IGNORE INTO metas (ano, contrato, target_ano) VALUES (?, ?, ?)`);
  stmt.run(2026, 'Total', 66989000);
}
