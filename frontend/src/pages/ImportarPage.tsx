import React, { useRef, useState } from 'react';
import { importApi } from '../utils/api';
import { SectionHeader, Card, Btn } from '../components/ui';
import { Upload, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';

export default function ImportarPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'replace' | 'merge'>('replace');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; inserted?: number; updated?: number; total?: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f: File) => {
    setFile(f);
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xlsb'))) handleFile(f);
    else alert('Por favor, selecione um arquivo .xlsx ou .xlsb');
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await importApi.upload(file, mode);
      setResult(res);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string; detail?: string } } };
      setResult({ success: false, message: err?.response?.data?.error || 'Erro ao importar. Verifique o arquivo.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <SectionHeader title="Importar Excel" sub="Carregue o arquivo Forecast Enel para popular o sistema" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Upload area */}
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Selecionar Arquivo</div>

          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => inputRef.current?.click()}
            style={{
              border: `1.5px dashed ${dragOver ? 'var(--blue-600)' : 'var(--gray-200)'}`,
              borderRadius: 10, padding: '32px 24px', textAlign: 'center', cursor: 'pointer',
              background: dragOver ? 'var(--blue-50)' : 'var(--gray-50)',
              transition: 'all .15s', marginBottom: 16,
            }}>
            <Upload size={28} color={dragOver ? 'var(--blue-600)' : 'var(--gray-400)'} style={{ marginBottom: 10 }} />
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
              {file ? file.name : 'Arraste o arquivo ou clique para selecionar'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>
              {file ? `${(file.size / 1024).toFixed(0)} KB` : 'Suporte: .xlsx, .xlsb'}
            </div>
            <input ref={inputRef} type="file" accept=".xlsx,.xlsb" style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>

          {/* Mode */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, color: 'var(--gray-600)' }}>Modo de importação</div>
            {[
              { val: 'replace', label: 'Substituir tudo', desc: 'Apaga os dados atuais e reimporta do zero' },
              { val: 'merge', label: 'Mesclar (atualizar)', desc: 'Atualiza projetos existentes, mantém cadastros manuais' },
            ].map(opt => (
              <label key={opt.val} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, border: `0.5px solid ${mode === opt.val ? 'var(--blue-400)' : 'var(--gray-200)'}`, background: mode === opt.val ? 'var(--blue-50)' : '#fff', cursor: 'pointer', marginBottom: 8 }}>
                <input type="radio" name="mode" value={opt.val} checked={mode === opt.val} onChange={() => setMode(opt.val as 'replace' | 'merge')} style={{ marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-600)' }}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>

          <Btn variant="primary" onClick={handleImport} disabled={!file || loading} style={{ width: '100%', justifyContent: 'center' }}>
            <Upload size={14} />
            {loading ? 'Importando...' : 'Importar Arquivo'}
          </Btn>
        </Card>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Result */}
          {result && (
            <div style={{
              padding: 16, borderRadius: 10,
              background: result.success ? 'var(--green-50)' : 'var(--red-50)',
              border: `0.5px solid ${result.success ? 'var(--teal-400)' : 'var(--red-400)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {result.success
                  ? <CheckCircle size={18} color="var(--teal-400)" />
                  : <AlertCircle size={18} color="var(--red-400)" />
                }
                <span style={{ fontWeight: 600, fontSize: 14, color: result.success ? 'var(--teal-600)' : 'var(--red-600)' }}>
                  {result.success ? 'Importação concluída!' : 'Erro na importação'}
                </span>
              </div>
              <div style={{ fontSize: 13, color: result.success ? 'var(--teal-600)' : 'var(--red-600)' }}>{result.message}</div>
              {result.success && (
                <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                  {[
                    { label: 'Total', val: result.total },
                    { label: 'Inseridos', val: result.inserted },
                    { label: 'Atualizados', val: result.updated },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--teal-600)' }}>{val}</div>
                      <div style={{ fontSize: 11, color: 'var(--teal-400)' }}>{label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* What is imported */}
          <Card>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>O que é importado?</div>
            {[
              { sheet: 'OPEN NET - Forecast Details', desc: 'Todos os projetos Open Network com status, regional, valores e margens' },
              { sheet: 'POWER NET - Forecast Details', desc: 'Todos os projetos Power Network' },
              { sheet: 'Forecast Full Year', desc: 'Distribuição mensal de revenues por projeto (Jan–Dez 2026)' },
            ].map(item => (
              <div key={item.sheet} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <FileSpreadsheet size={16} color="var(--green-400)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, fontFamily: 'monospace', color: 'var(--blue-600)' }}>{item.sheet}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-600)' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </Card>

          <Card>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Dicas</div>
            <ul style={{ paddingLeft: 16, fontSize: 12, color: 'var(--gray-600)', lineHeight: 1.8 }}>
              <li>Use o arquivo <strong>Forecast Enel 2026</strong> (.xlsx ou .xlsb)</li>
              <li>A importação identifica projetos pelo campo BR + nome da oportunidade</li>
              <li>Projetos cadastrados manualmente são preservados no modo Mesclar</li>
              <li>Após importar, navegue até Open Network ou Power Network para ver os dados</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
