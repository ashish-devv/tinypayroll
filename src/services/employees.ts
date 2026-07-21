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
    department: r.department ?? undefined,
    departmentId: r.departmentId != null ? String(r.departmentId) : undefined,
    designationId: r.designationId != null ? String(r.designationId) : undefined,
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
  department?: string;
  departmentId?: string;
  designationId?: string;
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

// ponytail: backend departmentId/designationId are Long — send numbers, not the string ids we hold in UI state.
function toPayload<T extends EmployeeInput>(input: T) {
  return {
    ...input,
    departmentId: input.departmentId != null ? Number(input.departmentId) : undefined,
    designationId: input.designationId != null ? Number(input.designationId) : undefined,
  };
}

export async function createEmployee(input: EmployeeInput): Promise<Employee> {
  const data = await api.post('/employees', toPayload(input));
  return toEmployee(data);
}

export async function updateEmployee(id: string, input: EmployeeInput & { status: 'ACTIVE' | 'INACTIVE' }): Promise<Employee> {
  const data = await api.put(`/employees/${id}`, toPayload(input));
  return toEmployee(data);
}

export async function deleteEmployee(id: string): Promise<void> {
  await api.delete(`/employees/${id}`);
}

// Flip an employee active/inactive without opening the edit form. The PUT endpoint expects
// the full record, so we rebuild the input payload from the employee we already hold.
export async function setEmployeeStatus(emp: Employee, status: 'ACTIVE' | 'INACTIVE'): Promise<Employee> {
  return updateEmployee(emp.id, {
    name: emp.name,
    role: emp.role,
    department: emp.department,
    departmentId: emp.departmentId,
    designationId: emp.designationId,
    baseSalary: emp.baseSalary,
    salaryType: emp.salaryType ?? (emp.baseSalary >= 10000 ? 'MONTHLY' : 'DAILY'),
    joinDate: emp.joinDate,
    phone: emp.phone,
    bankAccountNumber: emp.bankAccount,
    bankName: emp.bankName,
    ifsc: emp.ifsc,
    status,
  });
}
