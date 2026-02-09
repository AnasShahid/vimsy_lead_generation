import express from 'express';
import cors from 'cors';
import path from 'path';
import { discoveryRoutes } from './routes/discovery';
import { sitesRoutes } from './routes/sites';
import { csvRoutes } from './routes/csv';
import { settingsRoutes } from './routes/settings';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api/discovery', discoveryRoutes);
app.use('/api/sites', sitesRoutes);
app.use('/api/csv', csvRoutes);
app.use('/api/settings', settingsRoutes);

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
