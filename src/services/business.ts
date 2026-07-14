import { api } from '@/src/services/api';

export interface Business {
  id: number;
  companyName: string;
  industry: string | null;
  gstin: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  currency: string;
  currencySymbol: string;
  payDay: number;
  workingDaysPerMonth: number;
  otRate: number;
  autoReminders: boolean;
  whatsappPayslip: boolean;
}

export interface BusinessInput {
  companyName: string;
  industry?: string;
  gstin?: string;
  address?: string;
  email?: string;
  phone?: string;
  currency: string;
  currencySymbol: string;
  payDay: number;
  workingDaysPerMonth: number;
  otRate: number;
  autoReminders: boolean;
  whatsappPayslip: boolean;
}

export async function getBusiness(): Promise<Business> {
  return api.get('/business/me');
}

export async function updateBusiness(input: BusinessInput): Promise<Business> {
  return api.put('/business/me', input);
}
