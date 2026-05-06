export type Contrato = 'Open Network' | 'Power Network';
export type StatusProjeto = 'Closed Win' | 'Commit' | 'Upside' | 'Not Forecastable' | 'Closed Lost';
export type Regional = 'Enel RJ' | 'Enel SP' | 'Enel CE' | 'Enel EGP' | 'Enel X';

export const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'] as const;
export type Mes = typeof MESES[number];

export const QUARTERS: Record<string, Mes[]> = {
  Q1: ['Jan', 'Fev', 'Mar'],
  Q2: ['Abr', 'Mai', 'Jun'],
  Q3: ['Jul', 'Ago', 'Set'],
  Q4: ['Out', 'Nov', 'Dez'],
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
}

export interface ForecastMensal {
  id: number;
  projeto_id: number;
  mes: Mes;
  revenues: number;
  bookings: number;
  invoices: number;
  margem1: number;
  margem2: number;
}
