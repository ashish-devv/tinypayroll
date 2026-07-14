package com.tinypayroll.backend.payroll.dto;

import com.tinypayroll.backend.payroll.PayrollRunStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record PayrollRunResponse(
        Long id,
        String period,
        int month,
        int year,
        PayrollRunStatus status,
        BigDecimal totalAmount,
        LocalDate runDate,
        Instant paidAt,
        List<PayrollRunItemResponse> items) {}
