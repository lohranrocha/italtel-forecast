import axios from 'axios';
import type { Projeto, DashboardData, ForecastProjeto } from '../types';

const api = axios.create({ baseURL: '/api' });

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
