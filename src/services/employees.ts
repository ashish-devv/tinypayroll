import { api } from '@/src/services/api';
import type { Employee } from '@/src/types';

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function toEmployee(r: any): Employee {
  return {
    id: String(r.id),
    name: r.name,
    role: r.role,
    baseSalary: r.baseSalary,
    salaryType: r.salaryType === 'DAILY' ? 'DAILY' : 'MONTHLY',
    avatarInitials: initials(r.name),
    status: r.status === 'ACTIVE' ? 'active' : 'inactive',
    joinDate: r.joinDate,
    phone: r.phone ?? undefined,
    bankAccount: r.bankAccountNumber ?? undefined,
    bankName: r.bankName ?? undefined,
    ifsc: r.ifsc ?? undefined,
  };
}

export interface EmployeeInput {
  name: string;
  role: string;
  baseSalary: number;
  salaryType: 'MONTHLY' | 'DAILY';
  joinDate: string;
  phone?: string;
  bankAccountNumber?: string;
  bankName?: string;
  ifsc?: string;
}

export async function listEmployees(status?: 'ACTIVE' | 'INACTIVE'): Promise<Employee[]> {
  const qs = new URLSearchParams({ page: '0', size: '100', ...(status ? { status } : {}) });
  const data = await api.get(`/employees?${qs}`);
  return (data.content ?? []).map(toEmployee);
}

export async function getEmployee(id: string): Promise<Employee> {
  return toEmployee(await api.get(`/employees/${id}`));
}

export async function createEmployee(input: EmployeeInput): Promise<Employee> {
  const data = await api.post('/employees', input);
  return toEmployee(data);
}

export async function updateEmployee(id: string, input: EmployeeInput & { status: 'ACTIVE' | 'INACTIVE' }): Promise<Employee> {
  const data = await api.put(`/employees/${id}`, input);
  return toEmployee(data);
}

export async function deleteEmployee(id: string): Promise<void> {
  await api.delete(`/employees/${id}`);
}
