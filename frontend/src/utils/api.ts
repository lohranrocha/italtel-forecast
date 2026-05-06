import axios from 'axios';
import type { Projeto, DashboardData, ForecastProjeto } from '../types';

const api = axios.create({ baseURL: '/api', timeout: 10000 });

export const projetosApi = {
  list: (params?: Record<string, string>) =>
    api.get<Projeto[]>('/projetos', { params }).then(r => r.data),
  get: (id: number) =>
    api.get<Projeto & { forecast: unknown[] }>(`/projetos/${id}`).then(r => r.data),
  create: (data: Partial<Projeto> & { forecast?: Record<string, Record<string, number>> }) =>
    api.post<Projeto>('/projetos', data).then(r => r.data),
  update: (id: number, data: Partial<Projeto> & { forecast?: Record<string, Record<string, number>> }) =>
    api.put<Projeto>(`/projetos/${id}`, data).then(r => r.data),
  remove: (id: number) =>
    api.delete(`/projetos/${id}`).then(r => r.data),
};

export const dashboardApi = {
  get: () => api.get<DashboardData>('/dashboard').then(r => r.data),
  regionais: () => api.get('/dashboard/regionais').then(r => r.data),
};

export const forecastApi = {
  get: (params?: { contrato?: string; regional?: string }) =>
    api.get<{ projetos: ForecastProjeto[]; byRegional: Record<string, Record<string, number>> }>(
      '/forecast', { params }
    ).then(r => r.data),
};

export const importApi = {
  upload: (file: File, mode: 'replace' | 'merge') => {
    const form = new FormData();
    form.append('file', file);
    form.append('mode', mode);
    return api.post<{ success: boolean; inserted: number; updated: number; total: number; message: string }>(
      '/import', form, { headers: { 'Content-Type': 'multipart/form-data' } }
    ).then(r => r.data);
  },
};

export type FupRawRow = {
  rowNum: number; colA: string;
  rev: (number | null)[]; m1: (number | null)[]; m2: (number | null)[];
};
export type FupPreviewRow = {
  br: string; oportunidade: string | null; matched: boolean;
  revenues: number[]; total_rev: number;
  margem1_abs: number; margem2_abs: number;
  margem1_pct: number; margem2_pct: number;
  _raw: FupRawRow[];
};

export const importFupApi = {
  preview: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ success: boolean; rows: FupPreviewRow[]; meses: string[] }>(
      '/import-fup/preview', form, { headers: { 'Content-Type': 'multipart/form-data' } }
    ).then(r => r.data);
  },
  confirm: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ success: boolean; updated: number; not_found: number; not_found_brs: string[]; message: string }>(
      '/import-fup', form, { headers: { 'Content-Type': 'multipart/form-data' } }
    ).then(r => r.data);
  },
};

export const importPcrApi = {
  upload: (file: File, contrato: 'Open Network' | 'Power Network') => {
    const form = new FormData();
    form.append('file', file);
    form.append('contrato', contrato);
    return api.post<{
      success: boolean; projeto_id: number; br: string; oportunidade: string;
      regional: string; contrato: string; fob: number; margem: number;
      valor_liq: number; valor_bruto: number; message: string;
    }>('/import-pcr', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
  },
};
