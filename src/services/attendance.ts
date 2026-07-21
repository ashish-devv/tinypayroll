import { api } from '@/src/services/api';
import type { AttendanceRecord, AttendanceStatus } from '@/src/types';

const TO_API: Record<AttendanceStatus, string> = {
  present: 'PRESENT', absent: 'ABSENT', leave: 'LEAVE', holiday: 'HOLIDAY', weekend: 'WEEKEND',
};
const FROM_API: Record<string, AttendanceStatus> = {
  PRESENT: 'present', ABSENT: 'absent', LEAVE: 'leave', HOLIDAY: 'holiday', WEEKEND: 'weekend',
};

export async function listAttendance(month: number, year: number, employeeId?: string): Promise<AttendanceRecord[]> {
  const qs = new URLSearchParams({ month: String(month), year: String(year), ...(employeeId ? { employeeId } : {}) });
  const data = await api.get(`/attendance?${qs}`);
  return (data as any[]).map((r) => ({ employeeId: String(r.employeeId), date: r.date, status: FROM_API[r.status] }));
}

export async function markAttendance(employeeId: string, date: string, status: AttendanceStatus): Promise<void> {
  await api.post('/attendance', { records: [{ employeeId: Number(employeeId), date, status: TO_API[status] }] });
}

// Batch write — one POST for many day/status pairs (used by "Mark all remaining Present").
// The endpoint already accepts a records array, so this is a single round-trip.
export async function markAttendanceBatch(
  records: { employeeId: string; date: string; status: AttendanceStatus }[],
): Promise<void> {
  if (records.length === 0) return;
  await api.post('/attendance', {
    records: records.map((r) => ({ employeeId: Number(r.employeeId), date: r.date, status: TO_API[r.status] })),
  });
}
