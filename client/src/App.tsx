import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { DiscoveryPage } from './pages/DiscoveryPage';
import { EnrichmentPage } from './pages/EnrichmentPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { ReportsPage } from './pages/ReportsPage';
import { OutreachPage } from './pages/OutreachPage';
import { TrackingPage } from './pages/TrackingPage';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/discovery" element={<DiscoveryPage />} />
        <Route path="/enrichment" element={<EnrichmentPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/outreach" element={<OutreachPage />} />
        <Route path="/tracking" element={<TrackingPage />} />
      </Route>
    </Routes>
  );
}

export default App;
