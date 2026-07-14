package com.tinypayroll.backend.payroll.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Matches app/payroll/payslip.tsx display needs — company header + single employee's item. */
public record PayslipResponse(
        String companyName,
        String companyAddress,
        String period,
        LocalDate runDate,
        String currencySymbol,
        Long employeeId,
        String employeeName,
        String employeeRole,
        String employeeInitials,
        BigDecimal baseSalary,
        BigDecimal overtime,
        BigDecimal bonus,
        BigDecimal unpaidLeave,
        BigDecimal advances,
        BigDecimal deductions,
        BigDecimal finalSalary) {}
