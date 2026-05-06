import React, { useEffect, useState } from 'react';
import { forecastApi } from '../utils/api';
import { fmtBRL, fmtPct, fmtMargem, fmtBR } from '../utils/format';
import { MESES, QUARTERS, REGIONAL_COLORS, STATUS_COLORS, type ForecastProjeto, type StatusProjeto } from '../types';
import { SectionHeader, Card } from '../components/ui';

type ViewMode = 'quarter' | 'month' | 'both';

export default function ForecastPage() {
  const [data, setData] = useState<{ projetos: ForecastProjeto[]; byRegional: Record<string, Record<string, number>> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [contrato, setContrato] = useState('');
  const [regional, setRegional] = useState('');
  const [mode, setMode] = useState<ViewMode>('both');

  const load = () => {
    setLoading(true);
    forecastApi.get({ contrato: contrato || undefined, regional: regional || undefined })
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(load, [contrato, regional]);

  const quarters = Object.keys(QUARTERS);
  const qMonths: Record<string, typeof MESES[number][]> = QUARTERS as Record<string, typeof MESES[number][]>;

  // Columns to show
  const cols: { key: string; label: string; months?: string[] }[] =
    mode === 'quarter' ? quarters.map(q => ({ key: q, label: q, months: qMonths[q] })) :
    mode === 'month' ? MESES.map(m => ({ key: m, label: m })) :
    [
      ...quarters.flatMap(q => [
        { key: q, label: q, months: qMonths[q] },
        ...qMonths[q].map(m => ({ key: m, label: m })),
      ]),
    ];

  const cellVal = (p: ForecastProjeto, col: { key: string; months?: string[] }) => {
    if (col.months) return col.months.reduce((s, m) => s + (p.monthly[m] || 0), 0);
    return p.monthly[col.key as typeof MESES[number]] || 0;
  };

  const totalRow = (col: { key: string; months?: string[] }) => {
    if (!data) return 0;
    return data.projetos.reduce((s, p) => s + cellVal(p, col), 0);
  };

  const isQCol = (col: { months?: string[] }) => !!col.months;

  return (
    <div>
      <SectionHeader title="Forecast Full Year 2026" sub="Distribuição de revenues por projeto, quarter e mês">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={contrato} onChange={e => setContrato(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '0.5px solid var(--gray-200)', fontSize: 12, background: '#fff' }}>
            <option value="">Todos os contratos</option>
            <option>Open Network</option>
            <option>Power Network</option>
          </select>
          <select value={regional} onChange={e => setRegional(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '0.5px solid var(--gray-200)', fontSize: 12, background: '#fff' }}>
            <option value="">Todas as regionais</option>
            {['Enel RJ','Enel SP','Enel CE','Enel EGP','Enel X','CE','RJ','SP','EGP'].map(r => <option key={r}>{r}</option>)}
          </select>
          <div style={{ display: 'flex', border: '0.5px solid var(--gray-200)', borderRadius: 6, overflow: 'hidden' }}>
            {(['quarter','both','month'] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setMode(v)} style={{
                padding: '6px 12px', border: 'none', fontSize: 12, cursor: 'pointer',
                background: mode === v ? 'var(--blue-50)' : '#fff',
                color: mode === v ? 'var(--blue-600)' : 'var(--gray-600)',
                fontWeight: mode === v ? 500 : 400,
              }}>
                {v === 'quarter' ? 'Quarters' : v === 'month' ? 'Meses' : 'Q + M'}
              </button>
            ))}
          </div>
        </div>
      </SectionHeader>

      {/* Summary cards by regional */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 20 }}>
          {Object.entries(data.byRegional).map(([reg, vals]) => (
            <div key={reg} style={{
              padding: '10px 14px', borderRadius: 8, border: '0.5px solid var(--gray-200)',
              borderLeft: `3px solid ${REGIONAL_COLORS[reg] || 'var(--gray-400)'}`,
              background: regional === reg ? 'var(--blue-50)' : '#fff',
              cursor: 'pointer',
            }} onClick={() => setRegional(regional === reg ? '' : reg)}>
              <div style={{ fontSize: 11, fontWeight: 500, color: REGIONAL_COLORS[reg] || 'var(--gray-600)', marginBottom: 3 }}>{reg}</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{fmtBRL(vals['Total'] || 0, true)}</div>
              <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>
                2ª Marg: {fmtMargem(vals['margem2_weighted'] || 0)}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {quarters.map(q => (
                  <div key={q} style={{ fontSize: 10, color: 'var(--gray-400)' }}>
                    {q}: {fmtBRL(vals[q] || 0, true)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>Carregando forecast...</div>
      ) : !data || data.projetos.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ color: 'var(--gray-400)', marginBottom: 8 }}>Nenhum dado de forecast encontrado</div>
          <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>Importe o Excel ou cadastre projetos com dados de forecast mensal</div>
        </Card>
      ) : (
        <div style={{ background: '#fff', border: 'var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--gray-50)' }}>
                  <th style={{ ...thStyle, textAlign: 'left', minWidth: 220, position: 'sticky', left: 0, background: 'var(--gray-50)', zIndex: 2 }}>Oportunidade</th>
                  <th style={{ ...thStyle, minWidth: 90 }}>BR</th>
                  <th style={{ ...thStyle, minWidth: 80 }}>Regional</th>
                  <th style={{ ...thStyle, minWidth: 100 }}>Status</th>
                  <th style={{ ...thStyle, minWidth: 90, textAlign: 'right' }}>Total Líq.</th>
                  <th style={{ ...thStyle, minWidth: 70, textAlign: 'right' }}>2ª Marg.</th>
                  {cols.map(col => (
                    <th key={col.key} style={{
                      ...thStyle, minWidth: isQCol(col) ? 90 : 70, textAlign: 'right',
                      background: isQCol(col) ? '#e8f0fb' : 'var(--gray-50)',
                      fontWeight: isQCol(col) ? 600 : 400,
                    }}>{col.label}</th>
                  ))}
                </tr>
                <tr style={{ background: '#e8f0fb', fontWeight: 600 }}>
                  <th style={{ ...thStyle, textAlign: 'left', position: 'sticky', left: 0, background: '#e8f0fb', zIndex: 2, fontWeight: 700, color: 'var(--blue-800)' }} colSpan={4}>Total</th>
                  <th style={{ ...thStyle, textAlign: 'right', color: 'var(--blue-800)', fontWeight: 700 }}>
                    {data ? fmtBRL(data.projetos.reduce((s, p) => s + p.valor_liq, 0), true) : '—'}
                  </th>
                  <th style={{ ...thStyle, textAlign: 'right', color: 'var(--blue-800)', fontWeight: 700 }}>
                    {data ? (() => {
                      const den = data.projetos.reduce((s, p) => s + p.valor_liq, 0);
                      const num = data.projetos.reduce((s, p) => s + p.margem2 * p.valor_liq, 0);
                      return den > 0 ? fmtMargem(num / den) : '—';
                    })() : '—'}
                  </th>
                  {cols.map(col => (
                    <th key={col.key} style={{ ...thStyle, textAlign: 'right', color: 'var(--blue-800)', fontWeight: 700, background: isQCol(col) ? '#d5e5f7' : '#e8f0fb' }}>
                      {data ? fmtBRL(totalRow(col), true) : '—'}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.projetos.map(p => (
                  <tr key={p.id} onMouseEnter={e => (e.currentTarget.style.background='var(--gray-50)')} onMouseLeave={e => (e.currentTarget.style.background='')}>
                    <td style={{ ...tdStyle, fontWeight: 500, position: 'sticky', left: 0, background: 'inherit', zIndex: 1, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.oportunidade}
                    </td>
                    <td style={{ ...tdStyle, fontSize: 11, fontWeight: 600, color: 'var(--blue-700)', whiteSpace: 'nowrap' }}>{fmtBR(p.br)}</td>
                    <td style={{ ...tdStyle, fontSize: 11, color: REGIONAL_COLORS[p.regional] || 'var(--gray-600)', fontWeight: 500 }}>{p.regional}</td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                      {(() => {
                        const sc = STATUS_COLORS[p.status as StatusProjeto];
                        return (
                          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, whiteSpace: 'nowrap',
                            background: sc?.bg ?? 'var(--gray-100)',
                            color: sc?.text ?? 'var(--gray-600)',
                            border: `0.5px solid ${sc?.border ?? 'var(--gray-200)'}`,
                          }}>
                            {p.status}
                          </span>
                        );
                      })()}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: 'var(--blue-600)' }}>
                      {fmtBRL(p.valor_liq, true)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: p.margem2 > 0 ? 'var(--gray-700)' : 'var(--gray-300)' }}>
                      {fmtMargem(p.margem2)}
                    </td>
                    {cols.map(col => {
                      const val = cellVal(p, col);
                      return (
                        <td key={col.key} style={{
                          ...tdStyle, textAlign: 'right',
                          background: isQCol(col) ? (val > 0 ? '#f0f5fb' : undefined) : undefined,
                          fontWeight: isQCol(col) ? 500 : 400,
                          color: val > 0 ? 'inherit' : 'var(--gray-200)',
                        }}>
                          {val > 0 ? fmtBRL(val, true) : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '9px 10px', fontWeight: 500, fontSize: 11,
  color: 'var(--gray-600)', borderBottom: '0.5px solid var(--gray-200)',
  whiteSpace: 'nowrap',
};
const tdStyle: React.CSSProperties = {
  padding: '9px 10px', borderBottom: '0.5px solid var(--gray-100)',
};
