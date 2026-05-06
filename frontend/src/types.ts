export type Contrato = 'Open Network' | 'Power Network';
export type StatusProjeto = 'Closed Win' | 'Commit' | 'Upside' | 'Not Forecastable' | 'Closed Lost';

export const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'] as const;
export type Mes = typeof MESES[number];

export const QUARTERS: Record<string, Mes[]> = {
  Q1: ['Jan', 'Fev', 'Mar'],
  Q2: ['Abr', 'Mai', 'Jun'],
  Q3: ['Jul', 'Ago', 'Set'],
  Q4: ['Out', 'Nov', 'Dez'],
};

export const REGIONAIS = ['Enel RJ', 'Enel SP', 'Enel CE', 'Enel EGP', 'Enel X'] as const;

export const STATUS_COLORS: Record<StatusProjeto, { bg: string; text: string; border: string }> = {
  'Closed Win':       { bg: '#1A5C1A', text: '#FFFFFF', border: '#1A5C1A' },
  'Commit':           { bg: '#E8F5E8', text: '#2E7D32', border: '#81C784' },
  'Upside':           { bg: '#E3EDFA', text: '#1565C0', border: '#64B5F6' },
  'Not Forecastable': { bg: '#EEEEEE', text: '#616161', border: '#BDBDBD' },
  'Closed Lost':      { bg: '#F3E0E4', text: '#7B1A2E', border: '#C0607A' },
};

export const REGIONAL_COLORS: Record<string, string> = {
  'Enel RJ':  '#378ADD',
  'Enel SP':  '#7F77DD',
  'Enel CE':  '#5DCAA5',
  'Enel EGP': '#EF9F27',
  'Enel X':   '#D85A30',
};

export interface Projeto {
  id: number;
  contrato: Contrato;
  status: StatusProjeto;
  regional: string;
  br: string;
  did: string;
  oportunidade: string;
  cf: number;
  valor_liq: number;
  valor_bruto: number;
  po_pendente: number;
  fob: number;
  solicitante: string;
  solicitante_cargo: string;
  solicitante_telefone: string;
  solicitante_email: string;
  status_compra: string;
  status_po: string;
  margem1: number;
  margem2: number;
  created_at: string;
  updated_at: string;
  total_revenues?: number;
}

export interface ForecastProjeto extends Projeto {
  monthly: Record<Mes, number>;
  quarters: Record<string, number>;
  total: number;
}

export interface DashboardData {
  openNetwork: { byRegional: RegionalSummary[] };
  powerNetwork: { revenues: number; closed_win: number; margem1_weighted: number; margem2_weighted: number };
  grandTotal: {
    total_liq: number; closed_win: number; total_commit: number;
    upside: number; not_forecastable: number; closed_lost: number;
    margem1_weighted: number; margem2_weighted: number;
  };
  metas: { id: number; ano: number; contrato: string; target_ano: number }[];
  quarterSummary: { quarter: string; openNetwork: number; powerNetwork: number; total: number }[];
  monthlyChart: { mes: Mes; openNetwork: number; powerNetwork: number; total: number }[];
  statusBreakdown: { status: string; contrato: string; count: number; valor: number }[];
}

export interface RegionalSummary {
  regional: string;
  revenues: number;
  margem2_weighted: number;
  bookings: number;
  Q1: number; Q2: number; Q3: number; Q4: number;
}
