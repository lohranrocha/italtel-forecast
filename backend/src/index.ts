import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { getDb } from './database';

// Ensure data and uploads dirs exist
const dataDir = path.join(__dirname, '../data');
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Init DB
getDb();

import projetosRouter from './routes/projetos';
import dashboardRouter from './routes/dashboard';
import importarRouter from './routes/importar';
import forecastRouter from './routes/forecast';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/projetos', projetosRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/import', importarRouter);
app.use('/api/forecast', forecastRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`\n🚀 CRM Enel backend rodando em http://localhost:${PORT}`);
  console.log(`   API Health: http://localhost:${PORT}/api/health\n`);
});
