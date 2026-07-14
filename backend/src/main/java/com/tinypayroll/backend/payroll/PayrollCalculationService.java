package com.tinypayroll.backend.payroll;

import java.math.BigDecimal;
import org.springframework.stereotype.Service;

/** Pure calculation, mirrors src/utils/payroll.ts calculateFinalSalary exactly. */
@Service
public class PayrollCalculationService {

    public BigDecimal calculateFinalSalary(
            BigDecimal baseSalary,
            BigDecimal overtime,
            BigDecimal bonus,
            BigDecimal unpaidLeave,
            BigDecimal advances,
            BigDecimal deductions) {
        return baseSalary.add(overtime).add(bonus).subtract(unpaidLeave).subtract(advances).subtract(deductions);
    }
}
