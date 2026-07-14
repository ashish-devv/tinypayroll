package com.tinypayroll.backend.report.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record ExpenseSummaryResponse(LocalDate from, LocalDate to, BigDecimal totalAmount, List<PeriodExpense> periods) {

    public record PeriodExpense(String period, LocalDate runDate, BigDecimal totalAmount, String status) {}
}
