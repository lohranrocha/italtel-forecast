import React, { useEffect, useState } from 'react';
import { forecastApi } from '../utils/api';
import { fmtBRL, fmtMargem, fmtBR } from '../utils/format';
import { REGIONAL_COLORS, type ForecastProjeto, type StatusProjeto } from '../types';
import { SectionHeader, Card, StatusBadge, Btn } from '../components/ui';
import { Download } from 'lucide-react';

const QUARTER_COLORS: Record<string, string> = {
  Q1: '#4F8EF7',
  Q2: '#5DC4A5',
  Q3: '#EF9F27',
  Q4: '#C05ACA',
};

type ContratoData = {
  projetos: ForecastProjeto[];
  byRegional: Record<string, Record<string, number>>;
};

function sumQ(projetos: ForecastProjeto[]): Record<string, number> {
  const totals: Record<string, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0, Total: 0 };
  for (const p of projetos) {
    for (const q of ['Q1', 'Q2', 'Q3', 'Q4']) totals[q] += p.quarters[q] || 0;
    totals['Total'] += p.total;
  }
  return totals;
}

function weightedMargem(projetos: ForecastProjeto[]): number {
  const num = projetos.reduce((s, p) => s + p.margem2 * p.valor_liq, 0);
  const den = projetos.reduce((s, p) => s + p.valor_liq, 0);
  return den > 0 ? num / den : 0;
}

function groupByRegional(projetos: ForecastProjeto[]): Record<string, ForecastProjeto[]> {
  const map: Record<string, ForecastProjeto[]> = {};
  for (const p of projetos) {
    if (!map[p.regional]) map[p.regional] = [];
    map[p.regional].push(p);
  }
  return map;
}

function QBadge({ q, val }: { q: string; val: number }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 80 }}>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: QUARTER_COLORS[q] || 'var(--gray-500)', letterSpacing: '.06em', marginBottom: 2 }}>
        {q}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: val > 0 ? 'var(--gray-800)' : 'var(--gray-300)' }}>
        {val > 0 ? fmtBRL(val, true) : '—'}
      </div>
    </div>
  );
}

function ContractHeader({ label, color }: { label: string; color: string; totals: Record<string, number>; margem: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{ width: 4, height: 18, borderRadius: 2, background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 13, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--gray-100)' }} />
    </div>
  );
}

function RegionalBlock({
  regional, projetos, regAgg,
}: {
  regional: string;
  projetos: ForecastProjeto[];
  regAgg: Record<string, number>;
}) {
  const color = REGIONAL_COLORS[regional] || 'var(--gray-400)';
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

  return (
    <div style={{ background: '#fff', border: 'var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      {/* Regional header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px', flexWrap: 'wrap',
        background: `linear-gradient(135deg, ${color}12 0%, #fff 60%)`,
        borderBottom: `1px solid ${color}30`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto' }}>
          <div style={{ width: 4, height: 32, borderRadius: 2, background: color }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color }}>{regional}</div>
            <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>
              {projetos.length} projeto{projetos.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          {quarters.map(q => <QBadge key={q} q={q} val={regAgg[q] || 0} />)}
          <div style={{ width: 1, height: 32, background: 'var(--gray-200)' }} />
          <div style={{ textAlign: 'center', minWidth: 90 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--gray-500)', letterSpacing: '.06em', marginBottom: 2 }}>TOTAL</div>
            <div style={{ fontSize: 15, fontWeight: 700, color }}>{fmtBRL(regAgg['Total'] || 0, true)}</div>
          </div>
        </div>
      </div>

      {/* Projects table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--gray-50)' }}>
              <th style={thStyle}>Oportunidade</th>
              <th style={{ ...thStyle, width: 90 }}>BR</th>
              <th style={{ ...thStyle, width: 140 }}>Status</th>
              <th style={{ ...thStyle, textAlign: 'right', width: 80 }}>2ª Marg.</th>
              {quarters.map(q => (
                <th key={q} style={{ ...thStyle, textAlign: 'right', width: 90, color: QUARTER_COLORS[q], background: `${QUARTER_COLORS[q]}10` }}>
                  {q}
                </th>
              ))}
              <th style={{ ...thStyle, textAlign: 'right', width: 90, fontWeight: 700 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {projetos.map(p => (
              <tr key={p.id}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <td style={{ ...tdStyle, fontWeight: 500, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.oportunidade}
                </td>
                <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11, color: 'var(--blue-700)', fontWeight: 600 }}>
                  {fmtBR(p.br)}
                </td>
                <td style={tdStyle}>
                  <StatusBadge status={p.status as StatusProjeto} />
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', color: p.margem2 > 0 ? 'var(--gray-700)' : 'var(--gray-300)' }}>
                  {fmtMargem(p.margem2)}
                </td>
                {quarters.map(q => {
                  const val = p.quarters[q] || 0;
                  return (
                    <td key={q} style={{
                      ...tdStyle, textAlign: 'right',
                      background: val > 0 ? `${QUARTER_COLORS[q]}08` : undefined,
                      color: val > 0 ? 'var(--gray-700)' : 'var(--gray-300)',
                      fontWeight: val > 0 ? 500 : 400,
                    }}>
                      {val > 0 ? fmtBRL(val, true) : '—'}
                    </td>
                  );
                })}
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: p.total > 0 ? 'var(--blue-700)' : 'var(--gray-300)' }}>
                  {p.total > 0 ? fmtBRL(p.total, true) : '—'}
                </td>
              </tr>
            ))}
            {/* Subtotal row */}
            <tr style={{ background: `${color}08`, borderTop: `1px solid ${color}20` }}>
              <td style={{ ...tdStyle, fontWeight: 700, color, paddingLeft: 20 }} colSpan={2}>Subtotal {regional}</td>
              <td style={tdStyle} colSpan={2} />
              {quarters.map(q => (
                <td key={q} style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color }}>
                  {fmtBRL(regAgg[q] || 0, true)}
                </td>
              ))}
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color }}>
                {fmtBRL(regAgg['Total'] || 0, true)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DetalhamentoQuartersPage() {
  const [on, setOn] = useState<ContratoData | null>(null);
  const [pn, setPn] = useState<ContratoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      forecastApi.get({ contrato: 'Open Network' }),
      forecastApi.get({ contrato: 'Power Network' }),
    ]).then(([onData, pnData]) => {
      setOn(onData);
      setPn(pnData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

  const onTotals  = on ? sumQ(on.projetos) : { Q1: 0, Q2: 0, Q3: 0, Q4: 0, Total: 0 };
  const pnTotals  = pn ? sumQ(pn.projetos) : { Q1: 0, Q2: 0, Q3: 0, Q4: 0, Total: 0 };
  const onMargem  = on ? weightedMargem(on.projetos) : 0;
  const pnMargem  = pn ? weightedMargem(pn.projetos) : 0;
  const allProjetos = [...(on?.projetos ?? []), ...(pn?.projetos ?? [])];
  const grandMargem = weightedMargem(allProjetos);
  const grandTotals = {
    Q1: onTotals.Q1 + pnTotals.Q1,
    Q2: onTotals.Q2 + pnTotals.Q2,
    Q3: onTotals.Q3 + pnTotals.Q3,
    Q4: onTotals.Q4 + pnTotals.Q4,
    Total: onTotals.Total + pnTotals.Total,
  };

  const onByRegional = on ? groupByRegional(on.projetos) : {};
  const pnByRegional = pn ? groupByRegional(pn.projetos) : {};

  return (
    <div>
      <SectionHeader
        title="Detalhamento por Quarters"
        sub="Open Network + Power Network 2026 — Consolidado por contrato, regional e projetos"
      >
        <Btn variant="secondary" onClick={() => window.open('/api/export/quarters', '_blank')}>
          <Download size={14} />
          Exportar Excel
        </Btn>
      </SectionHeader>

      {/* Grand summary cards */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 32 }}>
          {[...quarters, 'Total'].map(q => {
            const total = grandTotals[q as keyof typeof grandTotals] || 0;
            const onVal = onTotals[q as keyof typeof onTotals] || 0;
            const pnVal = pnTotals[q as keyof typeof pnTotals] || 0;
            return (
              <div key={q} style={{
                background: '#fff', border: 'var(--border)', borderRadius: 'var(--radius-lg)',
                padding: '14px 18px', borderTop: `3px solid ${QUARTER_COLORS[q] || '#6B7280'}`,
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: QUARTER_COLORS[q] || 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
                  {q === 'Total' ? 'Total Geral' : q}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 8 }}>
                  {fmtBRL(total, true)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: 'var(--blue-600)', fontWeight: 500 }}>Open Net</span>
                    <span style={{ color: 'var(--gray-700)', fontWeight: 500 }}>{fmtBRL(onVal, true)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: '#7C3AED', fontWeight: 500 }}>Power Net</span>
                    <span style={{ color: 'var(--gray-700)', fontWeight: 500 }}>{fmtBRL(pnVal, true)}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Margem média anual */}
          <div style={{
            background: '#fff', border: 'var(--border)', borderRadius: 'var(--radius-lg)',
            padding: '14px 18px', borderTop: '3px solid #6B7280',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
              2ª Marg. Média
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 8 }}>
              {fmtMargem(grandMargem)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: 'var(--blue-600)', fontWeight: 500 }}>Open Net</span>
                <span style={{ color: 'var(--gray-700)', fontWeight: 500 }}>{fmtMargem(onMargem)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: '#7C3AED', fontWeight: 500 }}>Power Net</span>
                <span style={{ color: 'var(--gray-700)', fontWeight: 500 }}>{fmtMargem(pnMargem)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>Carregando...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* ── Open Network ──────────────────────────────────────── */}
          <div>
            <ContractHeader label="Open Network" color="var(--blue-600)" totals={onTotals} margem={onMargem} />
            {Object.keys(onByRegional).length === 0 ? (
              <Card style={{ textAlign: 'center', padding: 24 }}>
                <div style={{ color: 'var(--gray-400)' }}>Nenhum dado para Open Network</div>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {Object.keys(onByRegional).sort().map(regional => (
                  <RegionalBlock
                    key={regional}
                    regional={regional}
                    projetos={onByRegional[regional]}
                    regAgg={on!.byRegional[regional] || {}}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Power Network ─────────────────────────────────────── */}
          <div>
            <ContractHeader label="Power Network" color="#7C3AED" totals={pnTotals} margem={pnMargem} />
            {Object.keys(pnByRegional).length === 0 ? (
              <Card style={{ textAlign: 'center', padding: 24 }}>
                <div style={{ color: 'var(--gray-400)' }}>Nenhum dado para Power Network</div>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {Object.keys(pnByRegional).sort().map(regional => (
                  <RegionalBlock
                    key={regional}
                    regional={regional}
                    projetos={pnByRegional[regional]}
                    regAgg={pn!.byRegional[regional] || {}}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '8px 12px', fontWeight: 500, fontSize: 11,
  color: 'var(--gray-600)', borderBottom: '0.5px solid var(--gray-200)',
  textAlign: 'left', whiteSpace: 'nowrap',
};
const tdStyle: React.CSSProperties = {
  padding: '9px 12px', borderBottom: '0.5px solid var(--gray-100)',
};
