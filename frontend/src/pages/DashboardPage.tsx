import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { dashboardApi } from '../utils/api';
import { fmtBRL, fmtPct, fmtMargem } from '../utils/format';
import { REGIONAL_COLORS, type DashboardData } from '../types';
import { MetricCard, Card, SectionHeader, ProgressBar } from '../components/ui';
import { RefreshCw } from 'lucide-react';

const STATUS_PIE_COLORS: Record<string, string> = {
  'Closed Win': '#639922', 'Commit': '#185FA5',
  'Upside': '#BA7517', 'Not Forecastable': '#888780', 'Closed Lost': '#E24B4A',
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    dashboardApi.get().then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) return <div style={{ padding: 40, color: 'var(--gray-400)' }}>Carregando dashboard...</div>;
  if (!data) return <div style={{ padding: 40, color: 'var(--red-600)' }}>Erro ao carregar dados. Verifique se o backend está rodando.</div>;

  const { grandTotal, metas, monthlyChart, quarterSummary, openNetwork, statusBreakdown } = data;

  const totalMeta = metas.find(m => m.contrato === 'Open Network')?.target_ano || 34_000_000;

  const onRevenues = openNetwork.byRegional.reduce((s, r) => s + (r.revenues || 0), 0);
  const pnRevenues = data.powerNetwork?.revenues || 0;
  const totalRevenues = onRevenues + pnRevenues;

  // Pie data by status for ON
  const onStatus = statusBreakdown.filter(s => s.contrato === 'Open Network');

  return (
    <div>
      <SectionHeader title="Dashboard Resume 2026" sub="Visão executiva consolidada">
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: '0.5px solid var(--gray-200)', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer', color: 'var(--gray-600)' }}>
          <RefreshCw size={13} /> Atualizar
        </button>
      </SectionHeader>

      {/* Top metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 24 }}>
        <MetricCard
          label="Total Forecast (Líq.)"
          value={fmtBRL(totalRevenues, true)}
          sub={`Meta: ${fmtBRL(totalMeta, true)} · ${fmtPct(totalRevenues / totalMeta)}`}
          subColor={totalRevenues >= totalMeta * 0.8 ? 'var(--green-400)' : 'var(--amber-400)'}
          accent="var(--blue-600)"
        />
        <MetricCard
          label="Open Network"
          value={fmtBRL(onRevenues, true)}
          sub={`${fmtPct(onRevenues / totalRevenues)} do total`}
          accent="var(--teal-400)"
        />
        <MetricCard
          label="Power Network"
          value={fmtBRL(pnRevenues, true)}
          sub={`${fmtPct(pnRevenues / totalRevenues)} do total`}
          accent="var(--purple-400)"
        />
        <MetricCard
          label="Closed Win"
          value={fmtBRL(grandTotal.closed_win, true)}
          sub={`${fmtPct(grandTotal.closed_win / totalRevenues)} do forecast`}
          accent="var(--green-400)"
        />
        <MetricCard
          label="Commit"
          value={fmtBRL(grandTotal.total_commit, true)}
          sub="Alta probabilidade"
          accent="var(--blue-400)"
        />
        <MetricCard
          label="Upside"
          value={fmtBRL(grandTotal.upside, true)}
          sub="Possível"
          accent="var(--amber-400)"
        />
      </div>

      {/* Progress vs meta por contrato */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Atingimento vs Meta 2026</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
              <span style={{ fontWeight: 500 }}>Consolidado</span>
              <span style={{ color: 'var(--gray-600)' }}>{fmtBRL(totalRevenues, true)} / {fmtBRL(totalMeta, true)} ({fmtPct(totalRevenues / totalMeta)})</span>
            </div>
            <ProgressBar value={totalRevenues} max={totalMeta} color="var(--blue-600)" height={10} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Open Network', val: onRevenues, color: 'var(--teal-400)' },
              { label: 'Power Network', val: pnRevenues, color: 'var(--purple-400)' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                  <span style={{ fontWeight: 500 }}>{label}</span>
                  <span style={{ color: 'var(--gray-600)' }}>{fmtBRL(val, true)} ({fmtPct(val / totalMeta)})</span>
                </div>
                <ProgressBar value={val} max={totalMeta} color={color} height={6} />
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Monthly revenue chart */}
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Revenues por Mês</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyChart} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => fmtBRL(v, true)} tick={{ fontSize: 10 }} width={60} />
              <Tooltip formatter={(v: number) => fmtBRL(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="openNetwork" name="Open Network" fill="#1D9E75" radius={[2,2,0,0]} />
              <Bar dataKey="powerNetwork" name="Power Network" fill="#7F77DD" radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Status pie */}
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Open Network por Status</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={onStatus} dataKey="valor" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={({ status, percent }: { status: string; percent: number }) => `${status.split(' ')[0]} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                {onStatus.map(entry => (
                  <Cell key={entry.status} fill={STATUS_PIE_COLORS[entry.status] || '#ccc'} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => fmtBRL(v)} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Quarter summary table */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Distribuição por Quarter</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--gray-50)' }}>
                {['Quarter','Open Network','Power Network','Total'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', borderBottom: '0.5px solid var(--gray-200)', textAlign: h === 'Quarter' ? 'left' : 'right', fontSize: 12, color: 'var(--gray-600)', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {quarterSummary.map(q => (
                <tr key={q.quarter}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, borderBottom: '0.5px solid var(--gray-100)' }}>{q.quarter}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '0.5px solid var(--gray-100)' }}>{fmtBRL(q.openNetwork)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '0.5px solid var(--gray-100)' }}>{fmtBRL(q.powerNetwork)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, borderBottom: '0.5px solid var(--gray-100)', color: 'var(--blue-600)' }}>{fmtBRL(q.total)}</td>
                </tr>
              ))}
              <tr style={{ background: 'var(--gray-50)', fontWeight: 600 }}>
                <td style={{ padding: '10px 12px' }}>Total FY</td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>{fmtBRL(onRevenues)}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>{fmtBRL(pnRevenues)}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--blue-600)' }}>{fmtBRL(totalRevenues)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* By regional */}
      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Open Network por Regional</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
          {openNetwork.byRegional.map(r => (
            <div key={r.regional} style={{
              padding: '12px 14px', borderRadius: 8, border: '0.5px solid var(--gray-200)',
              borderLeft: `3px solid ${REGIONAL_COLORS[r.regional] || 'var(--blue-400)'}`,
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{r.regional || 'Sem Regional'}</div>
              <div style={{ fontSize: 17, fontWeight: 600 }}>{fmtBRL(r.revenues, true)}</div>
              <div style={{ fontSize: 11, color: 'var(--gray-600)', marginTop: 2 }}>
                2ª Marg: {fmtMargem(r.margem2_weighted || 0)}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
