import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { getDb } from './database';

const T_BOOT = Date.now();
console.log(`[boot] iniciando em ${new Date().toISOString()}`);

// Ensure data and uploads dirs exist
// OBS: DB_PATH em database.ts aponta para ../../data (raiz do projeto),
// então criamos os dois locais para garantir compatibilidade.
const dataDirRoot = path.join(__dirname, '../../data');
const dataDirBackend = path.join(__dirname, '../data');
const uploadsDir = path.join(__dirname, '../uploads');
for (const d of [dataDirRoot, dataDirBackend, uploadsDir]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

// Init DB
getDb();
console.log(`[boot] DB pronto em ${Date.now() - T_BOOT}ms`);

import projetosRouter from './routes/projetos';
import dashboardRouter from './routes/dashboard';
import importarRouter from './routes/importar';
import importarPcrRouter from './routes/importar-pcr';
import importarFupRouter from './routes/importar-fup';
import forecastRouter from './routes/forecast';
import exportRouter from './routes/export';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/projetos', projetosRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/import', importarRouter);
app.use('/api/import-pcr', importarPcrRouter);
app.use('/api/import-fup', importarFupRouter);
app.use('/api/forecast', forecastRouter);

app.use('/api/export', exportRouter);
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`\n🚀 CRM Enel backend rodando em http://localhost:${PORT}`);
  console.log(`   API Health: http://localhost:${PORT}/api/health`);
  console.log(`   Startup total: ${Date.now() - T_BOOT}ms\n`);
});
