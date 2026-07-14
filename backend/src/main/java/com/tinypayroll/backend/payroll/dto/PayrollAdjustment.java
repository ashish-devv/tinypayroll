package com.tinypayroll.backend.payroll.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

/** Dual-used: PUT /payroll-runs/{id}/items/{itemId} request body, and calc input. */
public record PayrollAdjustment(
        @NotNull BigDecimal overtime,
        @NotNull BigDecimal bonus,
        @NotNull BigDecimal unpaidLeave,
        @NotNull BigDecimal advances,
        @NotNull BigDecimal deductions) {}
