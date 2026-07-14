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
