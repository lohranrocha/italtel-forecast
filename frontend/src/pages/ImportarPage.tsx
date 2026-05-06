import React, { useRef, useState } from 'react';
import { importApi, importPcrApi, importFupApi, type FupPreviewRow } from '../utils/api';
import { fmtBRL, fmtPct as fmtPctUtil } from '../utils/format';
import { SectionHeader, Card, Btn } from '../components/ui';
import { Upload, CheckCircle, AlertCircle, FileSpreadsheet, ArrowRight } from 'lucide-react';

type Page = 'dashboard' | 'open-network' | 'power-network' | 'forecast' | 'quarters' | 'importar';

interface Props {
  onNavigate?: (page: Page) => void;
}

export default function ImportarPage({ onNavigate }: Props) {
  // Forecast import state
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'replace' | 'merge'>('replace');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; inserted?: number; updated?: number; total?: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // PCR import state
  const pcrInputRef = useRef<HTMLInputElement>(null);
  const [pcrFile, setPcrFile] = useState<File | null>(null);
  const [pcrContrato, setPcrContrato] = useState<'Open Network' | 'Power Network'>('Open Network');
  const [pcrLoading, setPcrLoading] = useState(false);
  const [pcrDragOver, setPcrDragOver] = useState(false);
  const [pcrResult, setPcrResult] = useState<{
    success: boolean; message: string;
    oportunidade?: string; br?: string; regional?: string; contrato?: string;
    fob?: number; margem?: number; valor_liq?: number; valor_bruto?: number;
    projeto_id?: number;
  } | null>(null);

  const handleFile = (f: File) => { setFile(f); setResult(null); };

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

  const handlePcrFile = (f: File) => { setPcrFile(f); setPcrResult(null); };

  const handlePcrDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setPcrDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.xlsm') || f.name.endsWith('.xlsx') || f.name.endsWith('.xlsb'))) handlePcrFile(f);
    else alert('Por favor, selecione um arquivo .xlsm, .xlsx ou .xlsb');
  };

  const handlePcrImport = async () => {
    if (!pcrFile) return;
    setPcrLoading(true);
    setPcrResult(null);
    try {
      const res = await importPcrApi.upload(pcrFile, pcrContrato);
      setPcrResult(res);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string; detail?: string } } };
      setPcrResult({ success: false, message: err?.response?.data?.error || 'Erro ao importar PCR. Verifique o arquivo.' });
    } finally {
      setPcrLoading(false);
    }
  };

  // FUP import state
  const fupInputRef = useRef<HTMLInputElement>(null);
  const [fupFile, setFupFile] = useState<File | null>(null);
  const [fupLoading, setFupLoading] = useState(false);
  const [fupDragOver, setFupDragOver] = useState(false);
  const [fupPreview, setFupPreview] = useState<{ rows: FupPreviewRow[]; meses: string[] } | null>(null);
  const [fupExpanded, setFupExpanded] = useState<string | null>(null);
  const [fupResult, setFupResult] = useState<{
    success: boolean; message: string;
    updated?: number; not_found?: number; not_found_brs?: string[];
  } | null>(null);

  const handleFupFile = (f: File) => { setFupFile(f); setFupPreview(null); setFupResult(null); };

  const handleFupDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setFupDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.xlsm') || f.name.endsWith('.xlsx') || f.name.endsWith('.xlsb'))) handleFupFile(f);
    else alert('Por favor, selecione um arquivo .xlsm, .xlsx ou .xlsb');
  };

  const handleFupPreview = async () => {
    if (!fupFile) return;
    setFupLoading(true);
    setFupPreview(null);
    setFupResult(null);
    try {
      const res = await importFupApi.preview(fupFile);
      setFupPreview(res);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setFupResult({ success: false, message: err?.response?.data?.error || 'Erro ao processar FUP.' });
    } finally {
      setFupLoading(false);
    }
  };

  const handleFupConfirm = async () => {
    if (!fupFile) return;
    setFupLoading(true);
    try {
      const res = await importFupApi.confirm(fupFile);
      setFupResult(res);
      setFupPreview(null);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setFupResult({ success: false, message: err?.response?.data?.error || 'Erro ao importar FUP.' });
    } finally {
      setFupLoading(false);
    }
  };

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(v);
  const fmtPct = (v: number) => fmtPctUtil(v);

  return (
    <div>
      <SectionHeader title="Importar Excel" sub="Carregue o arquivo Forecast Enel para popular o sistema" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
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

      {/* PCR Import Section */}
      <SectionHeader title="Importar PCR" sub="Carregue um arquivo .xlsm de PCR para cadastrar um projeto a partir do Resumo ITL" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Selecionar Arquivo PCR</div>

          <div
            onDrop={handlePcrDrop}
            onDragOver={e => { e.preventDefault(); setPcrDragOver(true); }}
            onDragLeave={() => setPcrDragOver(false)}
            onClick={() => pcrInputRef.current?.click()}
            style={{
              border: `1.5px dashed ${pcrDragOver ? 'var(--blue-600)' : 'var(--gray-200)'}`,
              borderRadius: 10, padding: '32px 24px', textAlign: 'center', cursor: 'pointer',
              background: pcrDragOver ? 'var(--blue-50)' : 'var(--gray-50)',
              transition: 'all .15s', marginBottom: 16,
            }}>
            <Upload size={28} color={pcrDragOver ? 'var(--blue-600)' : 'var(--gray-400)'} style={{ marginBottom: 10 }} />
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
              {pcrFile ? pcrFile.name : 'Arraste o arquivo PCR ou clique para selecionar'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>
              {pcrFile ? `${(pcrFile.size / 1024).toFixed(0)} KB` : 'Suporte: .xlsm, .xlsx, .xlsb'}
            </div>
            <input ref={pcrInputRef} type="file" accept=".xlsm,.xlsx,.xlsb" style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && handlePcrFile(e.target.files[0])} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, color: 'var(--gray-600)' }}>Contrato</div>
            {(['Open Network', 'Power Network'] as const).map(opt => (
              <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: `0.5px solid ${pcrContrato === opt ? 'var(--blue-400)' : 'var(--gray-200)'}`, background: pcrContrato === opt ? 'var(--blue-50)' : '#fff', cursor: 'pointer', marginBottom: 8 }}>
                <input type="radio" name="pcrContrato" value={opt} checked={pcrContrato === opt} onChange={() => setPcrContrato(opt)} style={{ marginTop: 0 }} />
                <div style={{ fontSize: 13, fontWeight: 500 }}>{opt}</div>
              </label>
            ))}
          </div>

          <Btn variant="primary" onClick={handlePcrImport} disabled={!pcrFile || pcrLoading} style={{ width: '100%', justifyContent: 'center' }}>
            <Upload size={14} />
            {pcrLoading ? 'Importando...' : 'Importar PCR'}
          </Btn>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {pcrResult && (
            <div style={{
              padding: 16, borderRadius: 10,
              background: pcrResult.success ? 'var(--green-50)' : 'var(--red-50)',
              border: `0.5px solid ${pcrResult.success ? 'var(--teal-400)' : 'var(--red-400)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {pcrResult.success
                  ? <CheckCircle size={18} color="var(--teal-400)" />
                  : <AlertCircle size={18} color="var(--red-400)" />
                }
                <span style={{ fontWeight: 600, fontSize: 14, color: pcrResult.success ? 'var(--teal-600)' : 'var(--red-600)' }}>
                  {pcrResult.success ? 'PCR importado!' : 'Erro na importação'}
                </span>
              </div>
              <div style={{ fontSize: 13, color: pcrResult.success ? 'var(--teal-600)' : 'var(--red-600)' }}>{pcrResult.message}</div>
              {pcrResult.success && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                    {[
                      { label: 'BR', val: pcrResult.br || '—' },
                      { label: 'Regional', val: pcrResult.regional || '—' },
                      { label: 'FOB', val: fmt(pcrResult.fob ?? 0) },
                      { label: 'Margem', val: fmtPct(pcrResult.margem ?? 0) },
                      { label: 'Valor Líquido', val: fmt(pcrResult.valor_liq ?? 0) },
                      { label: 'Valor Bruto', val: fmt(pcrResult.valor_bruto ?? 0) },
                    ].map(({ label, val }) => (
                      <div key={label} style={{ background: '#fff', borderRadius: 6, padding: '8px 10px', border: '0.5px solid var(--teal-200)' }}>
                        <div style={{ fontSize: 10, color: 'var(--teal-400)', fontWeight: 500, textTransform: 'uppercase' }}>{label}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal-700)' }}>{val}</div>
                      </div>
                    ))}
                  </div>
                  {onNavigate && (
                    <Btn
                      variant="primary"
                      onClick={() => onNavigate(pcrResult.contrato === 'Power Network' ? 'power-network' : 'open-network')}
                      style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}
                    >
                      Ver projeto em {pcrResult.contrato}
                      <ArrowRight size={14} />
                    </Btn>
                  )}
                </>
              )}
            </div>
          )}

          <Card>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>O que é lido no PCR?</div>
            {[
              { sheet: 'Resumo ITL – L29 (C)', desc: 'BR do projeto (ex: "BR 22461.428")' },
              { sheet: 'Resumo ITL – L30 (C)', desc: 'Nome da oportunidade (ex: "Projeto: SFPs Fortinet...")' },
              { sheet: 'Resumo ITL – L49 (N/O/P/R)', desc: 'FOB, Margem, Valor Líquido e Valor Bruto (DDP)' },
            ].map(item => (
              <div key={item.sheet} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <FileSpreadsheet size={16} color="var(--blue-400)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, fontFamily: 'monospace', color: 'var(--blue-600)' }}>{item.sheet}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-600)' }}>{item.desc}</div>
                </div>
              </div>
            ))}
            <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4, paddingTop: 8, borderTop: '0.5px solid var(--gray-100)' }}>
              Status fixo: <strong>Not Forecastable</strong> · CF fixo: <strong>0.29</strong> · Regional inferida do nome do projeto
            </div>
          </Card>
        </div>
      </div>

      {/* FUP Import Section */}
      <div style={{ marginTop: 28 }}>
        <SectionHeader
          title="Importar FUP"
          sub="Pré-visualize os dados extraídos antes de confirmar a importação"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: fupPreview ? 20 : 0 }}>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Selecionar Arquivo FUP</div>
          <div
            onDrop={handleFupDrop}
            onDragOver={e => { e.preventDefault(); setFupDragOver(true); }}
            onDragLeave={() => setFupDragOver(false)}
            onClick={() => fupInputRef.current?.click()}
            style={{
              border: `1.5px dashed ${fupDragOver ? 'var(--blue-600)' : 'var(--gray-200)'}`,
              borderRadius: 10, padding: '32px 24px', textAlign: 'center', cursor: 'pointer',
              background: fupDragOver ? 'var(--blue-50)' : 'var(--gray-50)',
              transition: 'all .15s', marginBottom: 16,
            }}>
            <Upload size={28} color={fupDragOver ? 'var(--blue-600)' : 'var(--gray-400)'} style={{ marginBottom: 10 }} />
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
              {fupFile ? fupFile.name : 'Arraste o arquivo FUP ou clique para selecionar'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>
              {fupFile ? `${(fupFile.size / 1024).toFixed(0)} KB` : 'Suporte: .xlsm, .xlsx, .xlsb'}
            </div>
            <input ref={fupInputRef} type="file" accept=".xlsm,.xlsx,.xlsb" style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && handleFupFile(e.target.files[0])} />
          </div>
          <Btn variant="secondary" onClick={handleFupPreview} disabled={!fupFile || fupLoading} style={{ width: '100%', justifyContent: 'center' }}>
            <FileSpreadsheet size={14} />
            {fupLoading && !fupPreview ? 'Processando...' : 'Pré-visualizar dados'}
          </Btn>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {fupResult && (
            <div style={{
              padding: 16, borderRadius: 10,
              background: fupResult.success ? 'var(--green-50)' : 'var(--red-50)',
              border: `0.5px solid ${fupResult.success ? 'var(--teal-400)' : 'var(--red-400)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {fupResult.success ? <CheckCircle size={18} color="var(--teal-400)" /> : <AlertCircle size={18} color="var(--red-400)" />}
                <span style={{ fontWeight: 600, fontSize: 14, color: fupResult.success ? 'var(--teal-600)' : 'var(--red-600)' }}>
                  {fupResult.success ? 'FUP importado!' : 'Erro'}
                </span>
              </div>
              <div style={{ fontSize: 13, color: fupResult.success ? 'var(--teal-600)' : 'var(--red-600)' }}>{fupResult.message}</div>
              {fupResult.not_found_brs && fupResult.not_found_brs.length > 0 && (
                <div style={{ marginTop: 10, padding: '8px 10px', background: '#fff', borderRadius: 6, border: '0.5px solid var(--teal-200)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-600)', marginBottom: 4 }}>BRs não encontrados ({fupResult.not_found_brs.length}):</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {fupResult.not_found_brs.map(br => (
                      <span key={br} style={{ fontSize: 11, fontFamily: 'monospace', padding: '2px 6px', borderRadius: 4, background: 'var(--gray-100)', color: 'var(--gray-600)' }}>{br}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <Card>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>O que é atualizado?</div>
            {[
              { sheet: 'Col. A → BR', desc: 'BRs Open Network (22461.xxx) — chave de matching' },
              { sheet: 'AN→AY → Revenues', desc: 'Revenue real por mês (Jan–Dez)' },
              { sheet: 'BA→BL → 1ª Margem', desc: 'Valor absoluto → calculado % sobre revenue' },
              { sheet: 'BN→BY → 2ª Margem', desc: 'Valor absoluto → calculado % sobre revenue' },
            ].map(item => (
              <div key={item.sheet} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                <FileSpreadsheet size={15} color="var(--teal-400)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue-600)' }}>{item.sheet}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{item.desc}</div>
                </div>
              </div>
            ))}
            <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 6, paddingTop: 8, borderTop: '0.5px solid var(--gray-100)' }}>
              BRs repetidos somados por mês · BRs sem match reportados, não criados
            </div>
          </Card>
        </div>
      </div>

      {/* Preview table */}
      {fupPreview && (
        <div style={{ background: '#fff', border: 'var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: 'var(--border)', background: 'var(--gray-50)' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Prévia — {fupPreview.rows.length} BRs encontrados</div>
              <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>
                {fupPreview.rows.filter(r => r.matched).length} com match · {fupPreview.rows.filter(r => !r.matched).length} sem match
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="secondary" onClick={() => setFupPreview(null)}>Cancelar</Btn>
              <Btn variant="primary" onClick={handleFupConfirm} disabled={fupLoading}>
                <CheckCircle size={14} />
                {fupLoading ? 'Importando...' : 'Confirmar Importação'}
              </Btn>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--gray-50)' }}>
                  <th style={thFup}>BR</th>
                  <th style={thFup}>Oportunidade</th>
                  <th style={{ ...thFup, textAlign: 'center' }}>Match</th>
                  {fupPreview.meses.map(m => <th key={m} style={{ ...thFup, textAlign: 'right', minWidth: 70 }}>{m}</th>)}
                  <th style={{ ...thFup, textAlign: 'right' }}>Total Rev.</th>
                  <th style={{ ...thFup, textAlign: 'right' }}>1ª Marg.</th>
                  <th style={{ ...thFup, textAlign: 'right' }}>2ª Marg.</th>
                </tr>
              </thead>
              <tbody>
                {fupPreview.rows.map(row => {
                  const expanded = fupExpanded === row.br;
                  const totalCols = 3 + fupPreview.meses.length + 3;
                  return (
                    <React.Fragment key={row.br}>
                      <tr
                        style={{ background: row.matched ? undefined : '#fff8f8', cursor: 'pointer' }}
                        onClick={() => setFupExpanded(expanded ? null : row.br)}
                        onMouseEnter={e => (e.currentTarget.style.background = row.matched ? 'var(--gray-50)' : '#fff0f0')}
                        onMouseLeave={e => (e.currentTarget.style.background = row.matched ? '' : '#fff8f8')}
                      >
                        <td style={{ ...tdFup, fontFamily: 'monospace', fontWeight: 600, color: 'var(--blue-700)' }}>
                          <span style={{ fontSize: 10, marginRight: 4, color: 'var(--gray-400)' }}>{expanded ? '▼' : '▶'}</span>
                          {row.br}
                        </td>
                        <td style={{ ...tdFup, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: row.matched ? undefined : 'var(--gray-400)' }}>
                          {row.oportunidade ?? <span style={{ color: 'var(--red-400)', fontStyle: 'italic' }}>Não encontrado</span>}
                        </td>
                        <td style={{ ...tdFup, textAlign: 'center' }}>
                          {row.matched ? <CheckCircle size={14} color="var(--teal-400)" /> : <AlertCircle size={14} color="var(--red-400)" />}
                        </td>
                        {row.revenues.map((v, i) => (
                          <td key={i} style={{ ...tdFup, textAlign: 'right', color: v > 0 ? 'var(--gray-700)' : v < 0 ? 'var(--red-600)' : 'var(--gray-300)' }}>
                            {v !== 0 ? fmtBRL(v) : '—'}
                          </td>
                        ))}
                        <td style={{ ...tdFup, textAlign: 'right', fontWeight: 700, color: 'var(--blue-700)' }}>{fmtBRL(row.total_rev)}</td>
                        <td style={{ ...tdFup, textAlign: 'right' }}>{fmtPct(row.margem1_pct)}</td>
                        <td style={{ ...tdFup, textAlign: 'right' }}>{fmtPct(row.margem2_pct)}</td>
                      </tr>
                      {expanded && row._raw.map((raw, ri) => (
                        <tr key={ri} style={{ background: '#f0f7ff' }}>
                          <td colSpan={totalCols} style={{ padding: '6px 16px' }}>
                            <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--gray-700)' }}>
                              <span style={{ fontWeight: 600, color: 'var(--blue-600)' }}>Linha {raw.rowNum}</span>
                              <span style={{ color: 'var(--gray-400)', margin: '0 8px' }}>|</span>
                              <span style={{ color: 'var(--gray-500)' }}>Col. A: </span>
                              <span style={{ fontWeight: 500 }}>{raw.colA}</span>
                              <span style={{ color: 'var(--gray-400)', margin: '0 8px' }}>|</span>
                              <span style={{ color: 'var(--gray-500)' }}>Rev (AN→AY): </span>
                              {raw.rev.map((v, i) => v !== null ? (
                                <span key={i} style={{ marginRight: 6, color: v !== 0 ? 'var(--blue-700)' : 'var(--gray-400)' }}>
                                  {fupPreview.meses[i]}:{v.toLocaleString('pt-BR')}
                                </span>
                              ) : null)}
                              <span style={{ color: 'var(--gray-400)', margin: '0 8px' }}>|</span>
                              <span style={{ color: 'var(--gray-500)' }}>M1 (BA→BL): </span>
                              {raw.m1.map((v, i) => v !== null && v !== 0 ? (
                                <span key={i} style={{ marginRight: 6, color: 'var(--teal-600)' }}>
                                  {fupPreview.meses[i]}:{v.toLocaleString('pt-BR')}
                                </span>
                              ) : null)}
                              <span style={{ color: 'var(--gray-400)', margin: '0 8px' }}>|</span>
                              <span style={{ color: 'var(--gray-500)' }}>M2 (BN→BY): </span>
                              {raw.m2.map((v, i) => v !== null && v !== 0 ? (
                                <span key={i} style={{ marginRight: 6, color: '#7C3AED' }}>
                                  {fupPreview.meses[i]}:{v.toLocaleString('pt-BR')}
                                </span>
                              ) : null)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const thFup: React.CSSProperties = {
  padding: '8px 10px', fontWeight: 500, fontSize: 11,
  color: 'var(--gray-600)', borderBottom: '0.5px solid var(--gray-200)',
  textAlign: 'left', whiteSpace: 'nowrap', background: 'var(--gray-50)',
};
const tdFup: React.CSSProperties = {
  padding: '8px 10px', borderBottom: '0.5px solid var(--gray-100)',
};
