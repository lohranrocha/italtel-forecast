import './index.css';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import PipelinePage from './pages/PipelinePage';
import ForecastPage from './pages/ForecastPage';
import ImportarPage from './pages/ImportarPage';

export default function App() {
  return (
    <Layout>
      {page => {
        if (page === 'dashboard') return <DashboardPage />;
        if (page === 'open-network') return <PipelinePage contrato="Open Network" />;
        if (page === 'power-network') return <PipelinePage contrato="Power Network" />;
        if (page === 'forecast') return <ForecastPage />;
        if (page === 'importar') return <ImportarPage />;
        return null;
      }}
    </Layout>
  );
}
