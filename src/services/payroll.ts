import { File, Paths } from 'expo-file-system';
import { api, getTokens, BASE_URL } from '@/src/services/api';
import type { PayrollRun, PayrollRunItem, PayrollStatus } from '@/src/types';

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function toStatus(s: string): PayrollStatus {
  return s === 'PAID' ? 'paid' : s === 'FAILED' ? 'failed' : 'pending'; // DRAFT/PENDING both "pending" in UI
}

function toItem(r: any): PayrollRunItem {
  return {
    employeeId: String(r.employeeId),
    baseSalary: r.baseSalary,
    overtime: r.overtime,
    bonus: r.bonus,
    unpaidLeave: r.unpaidLeave,
    advances: r.advances,
    deductions: r.deductions,
    finalSalary: r.finalSalary,
  };
}

function toRun(r: any): PayrollRun {
  return {
    id: String(r.id),
    period: `${MONTHS[r.month]} ${r.year}`,
    month: r.month,
    year: r.year,
    status: toStatus(r.status),
    totalAmount: r.totalAmount,
    runDate: r.runDate ?? r.createdAt ?? r.paidAt ?? new Date().toISOString(),
    items: (r.items ?? []).map(toItem),
  };
}

export async function listPayrollRuns(): Promise<PayrollRun[]> {
  const data = await api.get('/payroll-runs');
  return (data as any[]).map(toRun);
}

export async function getPayrollRun(id: string): Promise<PayrollRun> {
  return toRun(await api.get(`/payroll-runs/${id}`));
}

export async function createPayrollRun(month: number, year: number): Promise<PayrollRun> {
  return toRun(await api.post('/payroll-runs', { month, year }));
}

export async function finalizePayrollRun(id: string): Promise<PayrollRun> {
  return toRun(await api.post(`/payroll-runs/${id}/finalize`));
}

export async function deletePayrollRun(id: string): Promise<void> {
  await api.delete(`/payroll-runs/${id}`);
}

// ponytail: expo-file-system's File/Directory API is native-only (no web support), so web triggers
// a browser download via a Blob object URL instead of writing to a local file.
async function fetchPayslipPdfBlob(runId: string, employeeId: string): Promise<Blob> {
  const { accessToken } = await getTokens();
  const res = await fetch(`${BASE_URL}/payroll-runs/${runId}/payslip/${employeeId}/pdf`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  if (!res.ok) throw new Error(`Could not fetch payslip PDF (${res.status})`);
  return res.blob();
}

/** Downloads the payslip PDF to the device's cache dir and returns a local file:// uri (native only). */
export async function downloadPayslipPdf(runId: string, employeeId: string, filename: string): Promise<string> {
  const { accessToken } = await getTokens();
  const destination = new File(Paths.cache, filename);
  const output = await File.downloadFileAsync(
    `${BASE_URL}/payroll-runs/${runId}/payslip/${employeeId}/pdf`,
    destination,
    { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}, idempotent: true },
  );
  return output.uri;
}

/** Web fallback — triggers a browser download of the payslip PDF via an object URL. */
export async function downloadPayslipPdfWeb(runId: string, employeeId: string, filename: string): Promise<void> {
  const blob = await fetchPayslipPdfBlob(runId, employeeId);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
