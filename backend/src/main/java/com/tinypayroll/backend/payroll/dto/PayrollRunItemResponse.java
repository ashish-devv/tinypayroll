package com.tinypayroll.backend.payroll.dto;

import java.math.BigDecimal;

public record PayrollRunItemResponse(
        Long id,
        Long employeeId,
        String employeeName,
        String employeeInitials,
        BigDecimal baseSalary,
        BigDecimal overtime,
        BigDecimal bonus,
        BigDecimal unpaidLeave,
        BigDecimal advances,
        BigDecimal deductions,
        BigDecimal finalSalary) {}
