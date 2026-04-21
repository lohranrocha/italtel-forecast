import React, { useState } from 'react';
import {
  LayoutDashboard, TrendingUp, BarChart3, Upload, ChevronRight, Activity
} from 'lucide-react';

type Page = 'dashboard' | 'open-network' | 'power-network' | 'forecast' | 'importar';

interface LayoutProps {
  children: (page: Page) => React.ReactNode;
}

const NAV = [
  { id: 'dashboard' as Page, label: 'Dashboard Resume', icon: LayoutDashboard },
  { id: 'open-network' as Page, label: 'Open Network', icon: TrendingUp },
  { id: 'power-network' as Page, label: 'Power Network', icon: Activity },
  { id: 'forecast' as Page, label: 'Forecast Full Year', icon: BarChart3 },
  { id: 'importar' as Page, label: 'Importar Excel', icon: Upload },
];

export default function Layout({ children }: LayoutProps) {
  const [page, setPage] = useState<Page>('dashboard');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Topbar */}
      <header style={{
        height: 'var(--topbar-h)', background: '#fff', borderBottom: 'var(--border)',
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12,
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 6, background: 'var(--blue-600)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>E</span>
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}>CRM Enel</div>
            <div style={{ fontSize: 11, color: 'var(--gray-600)' }}>Forecast 2026</div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{
          fontSize: 12, background: 'var(--blue-50)', color: 'var(--blue-600)',
          padding: '3px 10px', borderRadius: 20, fontWeight: 500,
        }}>Analista Comercial</div>
      </header>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar */}
        <nav style={{
          width: 'var(--sidebar-w)', background: '#fff', borderRight: 'var(--border)',
          padding: '16px 0', position: 'sticky', top: 'var(--topbar-h)',
          height: 'calc(100vh - var(--topbar-h))', overflowY: 'auto', flexShrink: 0,
        }}>
          <div style={{ padding: '0 12px', marginBottom: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--gray-400)', letterSpacing: '.08em', textTransform: 'uppercase', padding: '8px 8px 4px' }}>
              Menu
            </div>
          </div>
          {NAV.map(item => {
            const active = page === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '8px 20px', border: 'none', textAlign: 'left', fontSize: 13,
                  background: active ? 'var(--blue-50)' : 'transparent',
                  color: active ? 'var(--blue-600)' : 'var(--gray-600)',
                  fontWeight: active ? 500 : 400,
                  borderLeft: active ? '2px solid var(--blue-600)' : '2px solid transparent',
                  transition: 'all .12s',
                }}
              >
                <Icon size={15} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {active && <ChevronRight size={13} />}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <main style={{ flex: 1, padding: 24, overflow: 'auto', minWidth: 0 }}>
          {children(page)}
        </main>
      </div>
    </div>
  );
}
