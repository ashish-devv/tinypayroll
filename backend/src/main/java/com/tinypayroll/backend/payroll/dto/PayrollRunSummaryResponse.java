package com.tinypayroll.backend.payroll.dto;

import com.tinypayroll.backend.payroll.PayrollRunStatus;
import java.math.BigDecimal;
import java.time.LocalDate;

/** List-view row — no items, matches (tabs)/payroll.tsx run-card needs. */
public record PayrollRunSummaryResponse(
        Long id,
        String period,
        int month,
        int year,
        PayrollRunStatus status,
        BigDecimal totalAmount,
        LocalDate runDate,
        int employeeCount) {}
