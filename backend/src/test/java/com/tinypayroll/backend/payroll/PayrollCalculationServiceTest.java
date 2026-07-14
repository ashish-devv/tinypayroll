package com.tinypayroll.backend.payroll;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

/** Mirrors src/utils/payroll.ts's self-check exactly (base 50000, overtime 2000, bonus 5000, unpaidLeave 3000, advances 1000, deductions 500 -> 52500). */
class PayrollCalculationServiceTest {

    private final PayrollCalculationService service = new PayrollCalculationService();

    @Test
    void matchesFrontendSelfCheck() {
        BigDecimal result = service.calculateFinalSalary(
                new BigDecimal("50000"),
                new BigDecimal("2000"),
                new BigDecimal("5000"),
                new BigDecimal("3000"),
                new BigDecimal("1000"),
                new BigDecimal("500"));
        assertThat(result).isEqualByComparingTo("52500");
    }

    @Test
    void zeroAdjustmentsReturnBaseSalary() {
        BigDecimal result = service.calculateFinalSalary(
                new BigDecimal("30000"), BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
        assertThat(result).isEqualByComparingTo("30000");
    }
}
