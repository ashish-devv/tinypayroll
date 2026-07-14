// Shared TypeScript types for TinyPayroll

export type EmployeeStatus = 'active' | 'inactive';

export interface Employee {
  id: string;
  name: string;
  role: string;
  baseSalary: number;       // monthly base in local currency
  salaryType?: 'MONTHLY' | 'DAILY';
  avatarInitials: string;
  status: EmployeeStatus;
  joinDate: string;         // ISO date string
  bankAccount?: string;
  bankName?: string;
  ifsc?: string;
  phone?: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'leave' | 'holiday' | 'weekend';

export interface AttendanceRecord {
  employeeId: string;
  date: string;             // YYYY-MM-DD
  status: AttendanceStatus;
}

export interface PayrollAdjustment {
  employeeId: string;
  overtime: number;         // amount (not hours)
  bonus: number;
  unpaidLeave: number;      // amount deducted
  advances: number;
  deductions: number;       // other deductions
}

export type PayrollStatus = 'pending' | 'paid' | 'failed';

export interface PayrollRunItem {
  employeeId: string;
  baseSalary: number;
  overtime: number;
  bonus: number;
  unpaidLeave: number;
  advances: number;
  deductions: number;
  finalSalary: number;      // computed
}

export interface PayrollRun {
  id: string;
  period: string;           // e.g. "June 2026"
  month: number;            // 1–12
  year: number;
  status: PayrollStatus;
  totalAmount: number;
  runDate: string;          // ISO date string
  items: PayrollRunItem[];
}

export interface BusinessConfig {
  companyName: string;
  currency: string;
  currencySymbol: string;
  payDay: number;           // day of month
  workingDaysPerMonth: number;
}
