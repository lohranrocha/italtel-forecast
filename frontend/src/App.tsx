import './index.css';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import PipelinePage from './pages/PipelinePage';
import ForecastPage from './pages/ForecastPage';
import DetalhamentoQuartersPage from './pages/DetalhamentoQuartersPage';
import ImportarPage from './pages/ImportarPage';

export default function App() {
  return (
    <Layout>
      {(page, setPage) => {
        if (page === 'dashboard') return <DashboardPage />;
        if (page === 'open-network') return <PipelinePage contrato="Open Network" />;
        if (page === 'power-network') return <PipelinePage contrato="Power Network" />;
        if (page === 'forecast') return <ForecastPage />;
        if (page === 'quarters') return <DetalhamentoQuartersPage />;
        if (page === 'importar') return <ImportarPage onNavigate={setPage} />;
        return null;
      }}
    </Layout>
  );
}
