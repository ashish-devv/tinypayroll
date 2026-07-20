import { api } from '@/src/services/api';
import type { Department } from '@/src/types';

function toDepartment(r: any): Department {
  return { id: String(r.id), name: r.name };
}

export async function listDepartments(): Promise<Department[]> {
  const data = await api.get('/departments');
  return (data ?? []).map(toDepartment);
}

export async function createDepartment(name: string): Promise<Department> {
  return toDepartment(await api.post('/departments', { name }));
}

export async function updateDepartment(id: string, name: string): Promise<Department> {
  return toDepartment(await api.put(`/departments/${id}`, { name }));
}

export async function deleteDepartment(id: string): Promise<void> {
  await api.delete(`/departments/${id}`);
}
