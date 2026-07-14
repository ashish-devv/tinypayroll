import type { PayrollAdjustment, PayrollRunItem } from '../types';

/**
 * Final Salary = Base Salary + Overtime + Bonus − Unpaid Leave − Advances − Deductions
 */
export function calculateFinalSalary(
  baseSalary: number,
  adj: Omit<PayrollAdjustment, 'employeeId'>
): number {
  return (
    baseSalary +
    adj.overtime +
    adj.bonus -
    adj.unpaidLeave -
    adj.advances -
    adj.deductions
  );
}

export function buildPayrollItem(
  employeeId: string,
  baseSalary: number,
  adj: Omit<PayrollAdjustment, 'employeeId'>
): PayrollRunItem {
  return {
    employeeId,
    baseSalary,
    ...adj,
    finalSalary: calculateFinalSalary(baseSalary, adj),
  };
}

export function formatCurrency(amount: number, symbol = '₹'): string {
  return `${symbol}${amount.toLocaleString('en-IN')}`;
}

// ponytail: self-check — run `npx ts-node src/utils/payroll.ts` to verify
if (require.main === module) {
  const result = calculateFinalSalary(50000, {
    overtime: 2000,
    bonus: 5000,
    unpaidLeave: 3000,
    advances: 1000,
    deductions: 500,
  });
  console.assert(result === 52500, `Expected 52500, got ${result}`);
  console.log('payroll util: OK', result);
}
