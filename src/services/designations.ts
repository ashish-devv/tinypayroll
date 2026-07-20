import { api } from '@/src/services/api';
import type { Designation } from '@/src/types';

function toDesignation(r: any): Designation {
  return {
    id: String(r.id),
    departmentId: r.departmentId != null ? String(r.departmentId) : undefined,
    name: r.name,
    defaultSalary: r.defaultSalary ?? undefined,
    defaultSalaryType: r.defaultSalaryType === 'DAILY' ? 'DAILY' : r.defaultSalaryType === 'MONTHLY' ? 'MONTHLY' : undefined,
  };
}

export interface DesignationInput {
  departmentId?: number | null;
  name: string;
  defaultSalary?: number;
  defaultSalaryType?: 'MONTHLY' | 'DAILY';
}

export async function listDesignations(): Promise<Designation[]> {
  const data = await api.get('/designations');
  return (data ?? []).map(toDesignation);
}

export async function createDesignation(input: DesignationInput): Promise<Designation> {
  return toDesignation(await api.post('/designations', input));
}

export async function updateDesignation(id: string, input: DesignationInput): Promise<Designation> {
  return toDesignation(await api.put(`/designations/${id}`, input));
}

export async function deleteDesignation(id: string): Promise<void> {
  await api.delete(`/designations/${id}`);
}
