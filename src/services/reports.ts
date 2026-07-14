import { api, getTokens, ApiError } from '@/src/services/api';
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';

// ponytail: mirrors api.ts's dev-only host resolution — kept local since exportCsv needs a raw
// (non-JSON) fetch that api.ts's apiFetch doesn't support.
const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8080/api/v1' : 'http://localhost:8080/api/v1';

export interface ExpensePeriod {
  period: string;
  runDate: string;
  totalAmount: number;
  status: 'DRAFT' | 'PENDING' | 'PAID' | 'FAILED';
}

export interface ExpenseSummary {
  from: string;
  to: string;
  totalAmount: number;
  periods: ExpensePeriod[];
}

export async function getExpenseSummary(from: string, to: string): Promise<ExpenseSummary> {
  const qs = new URLSearchParams({ from, to });
  return api.get(`/reports/expense-summary?${qs}`);
}

export interface AttendanceSummary {
  month: number;
  year: number;
  employees: {
    employeeId: number;
    employeeName: string;
    presentDays: number;
    absentDays: number;
    leaveDays: number;
    holidayDays: number;
    weekendDays: number;
  }[];
}

export async function getAttendanceSummary(month: number, year: number): Promise<AttendanceSummary> {
  const qs = new URLSearchParams({ month: String(month), year: String(year) });
  return api.get(`/reports/attendance-summary?${qs}`);
}

// ponytail: /reports/export streams text/csv, not JSON — apiFetch always calls res.json(), so this
// bypasses it and does its own fetch + auth header, mirroring apiFetch's error handling.
export async function exportExpenseCsv(from: string, to: string): Promise<string> {
  const { accessToken } = await getTokens();
  const qs = new URLSearchParams({ type: 'csv', from, to });
  const res = await fetch(`${BASE_URL}/reports/export?${qs}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try { message = (await res.json()).message ?? message; } catch { /* body wasn't JSON (e.g. plain text) */ }
    throw new ApiError(res.status, message);
  }
  return res.text();
}

// ponytail: expo-file-system's File/Directory API is native-only, so web triggers a browser
// download via a Blob object URL instead — mirrors src/services/payroll.ts's payslip PDF split.
async function fetchReportPdfBlob(from: string, to: string): Promise<Blob> {
  const { accessToken } = await getTokens();
  const qs = new URLSearchParams({ type: 'pdf', from, to });
  const res = await fetch(`${BASE_URL}/reports/export?${qs}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  if (!res.ok) throw new Error(`Could not fetch report PDF (${res.status})`);
  return res.blob();
}

/** Downloads the payroll summary PDF to the device's cache dir and returns a local file:// uri (native only). */
export async function downloadReportPdf(from: string, to: string, filename: string): Promise<string> {
  const { accessToken } = await getTokens();
  const qs = new URLSearchParams({ type: 'pdf', from, to });
  const destination = new File(Paths.cache, filename);
  const output = await File.downloadFileAsync(
    `${BASE_URL}/reports/export?${qs}`,
    destination,
    { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}, idempotent: true },
  );
  return output.uri;
}

/** Web fallback — triggers a browser download of the payroll summary PDF via an object URL. */
export async function downloadReportPdfWeb(from: string, to: string, filename: string): Promise<void> {
  const blob = await fetchReportPdfBlob(from, to);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
