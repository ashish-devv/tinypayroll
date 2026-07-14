package com.tinypayroll.backend.business.dto;

import java.math.BigDecimal;

public record BusinessResponse(
        Long id,
        String companyName,
        String industry,
        String gstin,
        String address,
        String email,
        String phone,
        String currency,
        String currencySymbol,
        int payDay,
        int workingDaysPerMonth,
        BigDecimal otRate,
        boolean autoReminders,
        boolean whatsappPayslip) {
}
