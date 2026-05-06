export function fmtBRL(value: number, compact = false): string {
  if (compact) {
    if (Math.abs(value) >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
  }
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
}

export function fmtPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function fmtMargem(value: number): string {
  if (!value || value === 0) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function fmtCF(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function fmtBR(br: string): string {
  if (!br) return '—';
  const n = parseFloat(br);
  if (isNaN(n)) return br;
  return n.toFixed(3);
}
