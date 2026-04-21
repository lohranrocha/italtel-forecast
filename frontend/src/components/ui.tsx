import React from 'react';
import { StatusProjeto, STATUS_COLORS } from '../types';

// ── MetricCard ───────────────────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
  accent?: string;
}
export function MetricCard({ label, value, sub, subColor, accent }: MetricCardProps) {
  return (
    <div style={{
      background: '#fff', border: 'var(--border)', borderRadius: 'var(--radius-lg)',
      padding: '14px 18px', borderTop: accent ? `3px solid ${accent}` : undefined,
    }}>
      <div style={{ fontSize: 12, color: 'var(--gray-600)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: subColor || 'var(--gray-400)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── StatusBadge ──────────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: StatusProjeto }) {
  const c = STATUS_COLORS[status] || { bg: '#eee', text: '#666', border: '#ccc' };
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, fontWeight: 500,
      padding: '2px 8px', borderRadius: 12,
      background: c.bg, color: c.text, border: `0.5px solid ${c.border}`,
      whiteSpace: 'nowrap',
    }}>{status}</span>
  );
}

// ── ProgressBar ──────────────────────────────────────────────────────────────
interface ProgressBarProps { value: number; max: number; color?: string; height?: number; }
export function ProgressBar({ value, max, color = 'var(--blue-400)', height = 6 }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height, background: 'var(--gray-100)', borderRadius: height, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: height, transition: 'width .4s' }} />
    </div>
  );
}

// ── SectionHeader ────────────────────────────────────────────────────────────
interface SectionHeaderProps { title: string; sub?: string; children?: React.ReactNode; }
export function SectionHeader({ title, sub, children }: SectionHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{title}</div>
        {sub && <div style={{ fontSize: 13, color: 'var(--gray-600)', marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ flex: 1 }} />
      {children}
    </div>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#fff', border: 'var(--border)', borderRadius: 'var(--radius-lg)',
      padding: '16px 20px', ...style,
    }}>{children}</div>
  );
}

// ── Table ────────────────────────────────────────────────────────────────────
interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: number | string;
}
interface TableProps<T> { columns: Column<T>[]; data: T[]; onRowClick?: (row: T) => void; emptyMsg?: string; }
export function Table<T extends Record<string, unknown>>({ columns, data, onRowClick, emptyMsg }: TableProps<T>) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} style={{
                textAlign: col.align || 'left', padding: '9px 12px',
                color: 'var(--gray-600)', fontWeight: 500, fontSize: 12,
                borderBottom: '0.5px solid var(--gray-200)',
                background: 'var(--gray-50)',
                whiteSpace: 'nowrap',
                width: col.width,
              }}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length} style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-400)' }}>
              {emptyMsg || 'Nenhum dado encontrado'}
            </td></tr>
          ) : data.map((row, i) => (
            <tr key={i}
              onClick={() => onRowClick?.(row)}
              style={{ cursor: onRowClick ? 'pointer' : undefined }}
              onMouseEnter={e => { if (onRowClick) (e.currentTarget as HTMLElement).style.background = 'var(--gray-50)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
            >
              {columns.map(col => (
                <td key={col.key} style={{
                  padding: '10px 12px', borderBottom: '0.5px solid var(--gray-100)',
                  textAlign: col.align || 'left', verticalAlign: 'middle',
                }}>
                  {col.render ? col.render(row) : String(row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Btn ──────────────────────────────────────────────────────────────────────
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md';
}
export function Btn({ variant = 'secondary', size = 'md', children, style, ...rest }: BtnProps) {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: size === 'sm' ? '5px 10px' : '7px 14px',
    borderRadius: 'var(--radius-md)', border: '0.5px solid',
    fontSize: size === 'sm' ? 12 : 13, fontWeight: 500, transition: 'all .12s',
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: 'var(--blue-600)', color: '#fff', borderColor: 'var(--blue-600)' },
    secondary: { background: '#fff', color: 'var(--gray-600)', borderColor: 'var(--gray-200)' },
    danger: { background: 'var(--red-50)', color: 'var(--red-600)', borderColor: 'var(--red-400)' },
  };
  return (
    <button style={{ ...base, ...variants[variant], ...style }} {...rest}>
      {children}
    </button>
  );
}

// ── FilterBar ────────────────────────────────────────────────────────────────
interface FilterBarProps {
  search: string; onSearch: (v: string) => void;
  filters?: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }[];
  children?: React.ReactNode;
}
export function FilterBar({ search, onSearch, filters, children }: FilterBarProps) {
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
      padding: '12px 16px', borderBottom: 'var(--border)', background: '#fff',
    }}>
      <input
        value={search} onChange={e => onSearch(e.target.value)}
        placeholder="Buscar oportunidade, BR, solicitante..."
        style={{
          flex: 1, minWidth: 200, padding: '7px 10px', borderRadius: 'var(--radius-md)',
          border: '0.5px solid var(--gray-200)', fontSize: 13, background: 'var(--gray-50)',
          outline: 'none', color: 'inherit',
        }}
      />
      {filters?.map(f => (
        <select key={f.label} value={f.value} onChange={e => f.onChange(e.target.value)}
          style={{
            padding: '7px 10px', borderRadius: 'var(--radius-md)', border: '0.5px solid var(--gray-200)',
            fontSize: 13, background: 'var(--gray-50)', color: 'inherit', outline: 'none',
          }}>
          <option value=''>{f.label}</option>
          {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ))}
      {children}
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────
interface ModalProps { open: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: number; }
export function Modal({ open, onClose, title, children, width = 560 }: ModalProps) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 'var(--radius-lg)', width, maxWidth: '95vw',
        maxHeight: '88vh', overflowY: 'auto', padding: 24,
        boxShadow: '0 8px 32px rgba(0,0,0,.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--gray-400)', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── FormField ────────────────────────────────────────────────────────────────
interface FormFieldProps { label: string; children: React.ReactNode; }
export function FormField({ label, children }: FormFieldProps) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, color: 'var(--gray-600)', marginBottom: 5, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-md)',
  border: '0.5px solid var(--gray-200)', fontSize: 13,
  background: 'var(--gray-50)', color: 'inherit', outline: 'none',
  fontFamily: 'inherit',
};
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input style={inputStyle} {...props} />;
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select style={inputStyle} {...props} />;
}
