import React, { useState, useEffect } from 'react';
import { Modal, FormField, Input, Select, Btn } from './ui';
import { MESES, REGIONAIS, type Projeto, type Contrato, type StatusProjeto } from '../types';
import { fmtBRL } from '../utils/format';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Projeto> & { forecast: Record<string, Record<string, number>> }) => Promise<void>;
  initial?: Projeto | null;
  defaultContrato?: Contrato;
}

const STATUSES: StatusProjeto[] = ['Closed Win','Commit','Upside','Not Forecastable','Closed Lost'];

const emptyForm = () => ({
  contrato: 'Open Network' as Contrato,
  status: 'Commit' as StatusProjeto,
  regional: 'Enel RJ',
  br: '', did: '', oportunidade: '', cf: '0.7',
  valor_liq: '', valor_bruto: '',
  solicitante: '', status_compra: '', status_po: '',
  margem1: '', margem2: '',
});

type MonthForecast = Record<string, string>;

export default function ProjetoModal({ open, onClose, onSave, initial, defaultContrato }: Props) {
  const [form, setForm] = useState(emptyForm());
  const [monthly, setMonthly] = useState<MonthForecast>(Object.fromEntries(MESES.map(m => [m, ''])));
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'dados'|'forecast'>('dados');

  useEffect(() => {
    if (initial) {
      setForm({
        contrato: initial.contrato,
        status: initial.status,
        regional: initial.regional,
        br: initial.br, did: initial.did,
        oportunidade: initial.oportunidade,
        cf: String(initial.cf),
        valor_liq: String(initial.valor_liq),
        valor_bruto: String(initial.valor_bruto),
        solicitante: initial.solicitante,
        status_compra: initial.status_compra,
        status_po: initial.status_po,
        margem1: String(initial.margem1),
        margem2: String(initial.margem2),
      });
    } else {
      setForm({ ...emptyForm(), contrato: defaultContrato || 'Open Network' });
      setMonthly(Object.fromEntries(MESES.map(m => [m, ''])));
    }
    setTab('dados');
  }, [initial, open, defaultContrato]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.oportunidade.trim()) { alert('Nome da oportunidade é obrigatório'); return; }
    setSaving(true);
    const forecast: Record<string, Record<string, number>> = {};
    for (const m of MESES) {
      const v = parseFloat(monthly[m]) || 0;
      if (v > 0) forecast[m] = { revenues: v };
    }
    await onSave({
      contrato: form.contrato,
      status: form.status,
      regional: form.regional,
      br: form.br, did: form.did,
      oportunidade: form.oportunidade,
      cf: parseFloat(form.cf) || 0,
      valor_liq: parseFloat(form.valor_liq) || 0,
      valor_bruto: parseFloat(form.valor_bruto) || 0,
      solicitante: form.solicitante,
      status_compra: form.status_compra,
      status_po: form.status_po,
      margem1: parseFloat(form.margem1) || 0,
      margem2: parseFloat(form.margem2) || 0,
      forecast,
    });
    setSaving(false);
  };

  const totalForecast = MESES.reduce((s, m) => s + (parseFloat(monthly[m]) || 0), 0);

  const tabStyle = (t: string): React.CSSProperties => ({
    padding: '6px 14px', border: 'none', background: 'none', cursor: 'pointer',
    fontSize: 13, borderBottom: tab === t ? '2px solid var(--blue-600)' : '2px solid transparent',
    color: tab === t ? 'var(--blue-600)' : 'var(--gray-600)', fontWeight: tab === t ? 500 : 400,
  });

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar Projeto' : 'Novo Projeto'} width={620}>
      <div style={{ display: 'flex', borderBottom: '0.5px solid var(--gray-200)', marginBottom: 18 }}>
        <button style={tabStyle('dados')} onClick={() => setTab('dados')}>Dados do Projeto</button>
        <button style={tabStyle('forecast')} onClick={() => setTab('forecast')}>
          Forecast Mensal {totalForecast > 0 ? `(${fmtBRL(totalForecast, true)})` : ''}
        </button>
      </div>

      {tab === 'dados' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Contrato">
              <Select value={form.contrato} onChange={e => set('contrato', e.target.value)}>
                <option>Open Network</option>
                <option>Power Network</option>
              </Select>
            </FormField>
            <FormField label="Status">
              <Select value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField label="Oportunidade">
            <Input value={form.oportunidade} onChange={e => set('oportunidade', e.target.value)} placeholder="Nome da oportunidade" />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Regional">
              <Select value={form.regional} onChange={e => set('regional', e.target.value)}>
                {REGIONAIS.map(r => <option key={r}>{r}</option>)}
                <option>CE</option><option>RJ</option><option>SP</option><option>EGP</option>
              </Select>
            </FormField>
            <FormField label="BR (nº do projeto)">
              <Input value={form.br} onChange={e => set('br', e.target.value)} placeholder="22461.XXX" />
            </FormField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Valor Líquido (R$)">
              <Input type="number" value={form.valor_liq} onChange={e => set('valor_liq', e.target.value)} placeholder="0" />
            </FormField>
            <FormField label="Valor Bruto (R$)">
              <Input type="number" value={form.valor_bruto} onChange={e => set('valor_bruto', e.target.value)} placeholder="0" />
            </FormField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <FormField label="CF (probabilidade)">
              <Input type="number" step="0.1" min="0" max="1" value={form.cf} onChange={e => set('cf', e.target.value)} placeholder="0.7" />
            </FormField>
            <FormField label="1ª Margem">
              <Input type="number" step="0.01" value={form.margem1} onChange={e => set('margem1', e.target.value)} placeholder="0.20" />
            </FormField>
            <FormField label="2ª Margem">
              <Input type="number" step="0.01" value={form.margem2} onChange={e => set('margem2', e.target.value)} placeholder="0.20" />
            </FormField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="DID"><Input value={form.did} onChange={e => set('did', e.target.value)} placeholder="DID do projeto" /></FormField>
            <FormField label="Solicitante"><Input value={form.solicitante} onChange={e => set('solicitante', e.target.value)} /></FormField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Status Compra"><Input value={form.status_compra} onChange={e => set('status_compra', e.target.value)} /></FormField>
            <FormField label="Status PO"><Input value={form.status_po} onChange={e => set('status_po', e.target.value)} /></FormField>
          </div>
        </>
      )}

      {tab === 'forecast' && (
        <>
          <div style={{ fontSize: 12, color: 'var(--gray-600)', marginBottom: 14 }}>
            Distribua os revenues ao longo do ano (R$). Total: <strong>{fmtBRL(totalForecast)}</strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {MESES.map(m => (
              <FormField key={m} label={m}>
                <Input type="number" value={monthly[m]} onChange={e => setMonthly(prev => ({ ...prev, [m]: e.target.value }))} placeholder="0" />
              </FormField>
            ))}
          </div>
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '0.5px solid var(--gray-200)' }}>
        <Btn onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Btn>
      </div>
    </Modal>
  );
}
