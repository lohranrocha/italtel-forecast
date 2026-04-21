import React, { useEffect, useState, useCallback } from 'react';
import { projetosApi } from '../utils/api';
import { fmtBRL, fmtPct, fmtCF, fmtMargem } from '../utils/format';
import { type Projeto, type Contrato, type StatusProjeto, STATUS_COLORS, REGIONAL_COLORS } from '../types';
import { Table, StatusBadge, SectionHeader, FilterBar, Btn, Card, MetricCard } from '../components/ui';
import ProjetoModal from '../components/ProjetoModal';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface Props { contrato: Contrato; }

const REGIONAIS_ON = ['Enel RJ','Enel SP','Enel CE','Enel EGP','Enel X'];
const REGIONAIS_PN = ['CE','RJ','SP','EGP'];
const STATUSES: StatusProjeto[] = ['Closed Win','Commit','Upside','Not Forecastable','Closed Lost'];

export default function PipelinePage({ contrato }: Props) {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRegional, setFilterRegional] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Projeto | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const regionais = contrato === 'Open Network' ? REGIONAIS_ON : REGIONAIS_PN;

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = { contrato };
    if (filterStatus) params.status = filterStatus;
    if (filterRegional) params.regional = filterRegional;
    if (search) params.search = search;
    projetosApi.list(params).then(d => { setProjetos(d); setLoading(false); });
  }, [contrato, filterStatus, filterRegional, search]);

  useEffect(load, [load]);

  const handleSave = async (data: Parameters<typeof projetosApi.create>[0]) => {
    if (editing) {
      await projetosApi.update(editing.id, data);
    } else {
      await projetosApi.create(data);
    }
    setModalOpen(false);
    setEditing(null);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Confirmar exclusão do projeto?')) return;
    setDeleting(id);
    await projetosApi.remove(id);
    setDeleting(null);
    load();
  };

  const sorted = [...projetos].sort((a, b) => {
    const rA = regionais.indexOf(a.regional);
    const rB = regionais.indexOf(b.regional);
    if (rA !== rB) return (rA === -1 ? 99 : rA) - (rB === -1 ? 99 : rB);
    const sA = STATUSES.indexOf(a.status as StatusProjeto);
    const sB = STATUSES.indexOf(b.status as StatusProjeto);
    return (sA === -1 ? 99 : sA) - (sB === -1 ? 99 : sB);
  });

  // Summary metrics
  const total = projetos.reduce((s, p) => s + p.valor_liq, 0);
  const byStat = (s: StatusProjeto) => projetos.filter(p => p.status === s).reduce((a, p) => a + p.valor_liq, 0);
  const closedWin = byStat('Closed Win');
  const commit = byStat('Commit');
  const upside = byStat('Upside');

  const columns = [
    {
      key: 'status', header: 'Status', width: 140,
      render: (row: Projeto) => <StatusBadge status={row.status} />,
    },
    {
      key: 'regional', header: 'Regional', width: 110,
      render: (row: Projeto) => (
        <span style={{ fontSize: 12, fontWeight: 500, color: REGIONAL_COLORS[row.regional] || 'var(--gray-600)' }}>
          {row.regional}
        </span>
      ),
    },
    {
      key: 'br', header: 'BR', width: 90,
      render: (row: Projeto) => <span style={{ fontSize: 11, color: 'var(--gray-600)', fontFamily: 'monospace' }}>{row.br}</span>,
    },
    {
      key: 'oportunidade', header: 'Oportunidade',
      render: (row: Projeto) => (
        <div>
          <div style={{ fontWeight: 500, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {row.oportunidade}
          </div>
          {row.solicitante && <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{row.solicitante}</div>}
        </div>
      ),
    },
    {
      key: 'cf', header: 'CF', width: 56, align: 'center' as const,
      render: (row: Projeto) => <span style={{ fontSize: 12 }}>{fmtCF(row.cf)}</span>,
    },
    {
      key: 'valor_liq', header: 'Valor Líq.', width: 120, align: 'right' as const,
      render: (row: Projeto) => <span style={{ fontWeight: 500 }}>{fmtBRL(row.valor_liq)}</span>,
    },
    {
      key: 'valor_bruto', header: 'Valor Bruto', width: 120, align: 'right' as const,
      render: (row: Projeto) => <span style={{ color: 'var(--gray-600)' }}>{fmtBRL(row.valor_bruto)}</span>,
    },
    {
      key: 'margem2', header: '2ª Marg.', width: 80, align: 'right' as const,
      render: (row: Projeto) => <span>{fmtMargem(row.margem2)}</span>,
    },
    {
      key: 'status_po', header: 'Status PO', width: 90,
      render: (row: Projeto) => row.status_po ? (
        <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 10, background: 'var(--gray-100)', color: 'var(--gray-600)' }}>
          {row.status_po}
        </span>
      ) : null,
    },
    {
      key: 'actions', header: '', width: 80, align: 'right' as const,
      render: (row: Projeto) => (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
          <button onClick={e => { e.stopPropagation(); setEditing(row); setModalOpen(true); }}
            style={{ padding: '4px 6px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--gray-400)', borderRadius: 4 }}>
            <Pencil size={13} />
          </button>
          <button onClick={e => { e.stopPropagation(); handleDelete(row.id); }}
            disabled={deleting === row.id}
            style={{ padding: '4px 6px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--red-400)', borderRadius: 4 }}>
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <SectionHeader
        title={contrato}
        sub={`${projetos.length} oportunidades · Total: ${fmtBRL(total, true)}`}
      >
        <Btn variant="primary" onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus size={14} /> Novo Projeto
        </Btn>
      </SectionHeader>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 20 }}>
        {STATUSES.map(s => {
          const val = byStat(s);
          const c = STATUS_COLORS[s];
          return (
            <div key={s} onClick={() => setFilterStatus(filterStatus === s ? '' : s)} style={{
              padding: '10px 14px', borderRadius: 8, border: `0.5px solid ${c.border}`,
              background: filterStatus === s ? c.bg : '#fff', cursor: 'pointer',
              borderLeft: `3px solid ${c.border}`,
            }}>
              <div style={{ fontSize: 11, color: filterStatus === s ? c.text : c.border, fontWeight: 500, marginBottom: 3 }}>{s}</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{fmtBRL(val, true)}</div>
              <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                {projetos.filter(p => p.status === s).length} proj.
              </div>
            </div>
          );
        })}
      </div>

      {/* Forecast bar */}
      {total > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Composição do Pipeline</div>
          <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', gap: 1 }}>
            {[
              { val: closedWin, color: '#639922', label: 'Closed Win' },
              { val: commit, color: '#185FA5', label: 'Commit' },
              { val: upside, color: '#BA7517', label: 'Upside' },
              { val: byStat('Not Forecastable'), color: '#888780', label: 'Not Forecastable' },
            ].map(({ val, color }) => (
              <div key={color} style={{ width: `${(val / total) * 100}%`, background: color, minWidth: val > 0 ? 2 : 0 }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
            {[
              { val: closedWin, color: '#639922', label: 'Closed Win' },
              { val: commit, color: '#185FA5', label: 'Commit' },
              { val: upside, color: '#BA7517', label: 'Upside' },
              { val: byStat('Not Forecastable'), color: '#888780', label: 'NF' },
            ].map(({ val, color, label }) => val > 0 && (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                <span style={{ color: 'var(--gray-600)' }}>{label}</span>
                <span style={{ fontWeight: 500 }}>{fmtPct(val / total)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Table */}
      <div style={{ background: '#fff', border: 'var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <FilterBar
          search={search} onSearch={setSearch}
          filters={[
            {
              label: 'Regional', value: filterRegional, onChange: setFilterRegional,
              options: regionais.map(r => ({ value: r, label: r })),
            },
            {
              label: 'Status', value: filterStatus, onChange: setFilterStatus,
              options: STATUSES.map(s => ({ value: s, label: s })),
            },
          ]}
        />
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--gray-400)' }}>Carregando...</div>
        ) : (
          <Table columns={columns} data={sorted as unknown as Record<string, unknown>[]} emptyMsg="Nenhum projeto encontrado" />
        )}
      </div>

      <ProjetoModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
        initial={editing}
        defaultContrato={contrato}
      />
    </div>
  );
}
