import express from 'express';
import cors from 'cors';
import path from 'path';
import { discoveryRoutes } from './routes/discovery';
import { sitesRoutes } from './routes/sites';
import { csvRoutes } from './routes/csv';
import { settingsRoutes } from './routes/settings';
import { enrichmentRoutes } from './routes/enrichment';
import { analysisRoutes } from './routes/analysis';
import { tagRoutes } from './routes/tags';
import { reportRoutes } from './routes/reports';
import { leadsRoutes } from './routes/leads';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api/discovery', discoveryRoutes);
app.use('/api/sites', sitesRoutes);
app.use('/api/csv', csvRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/enrichment', enrichmentRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/leads', leadsRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve client in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

export { app };
