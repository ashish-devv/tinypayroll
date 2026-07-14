package com.tinypayroll.backend.business.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record UpdateBusinessRequest(
        @NotBlank @Size(max = 150) String companyName,
        @Size(max = 100) String industry,
        @Pattern(regexp = "^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$", message = "Invalid GSTIN format")
                String gstin,
        @Size(max = 255) String address,
        @Email String email,
        @Pattern(regexp = "^[+]?[0-9]{10,15}$", message = "Invalid phone number") String phone,
        @NotBlank @Size(max = 10) String currency,
        @NotBlank @Size(max = 5) String currencySymbol,
        @Min(1) @Max(31) int payDay,
        @Min(1) @Max(31) int workingDaysPerMonth,
        @DecimalMin(value = "0.0", inclusive = true) BigDecimal otRate,
        boolean autoReminders,
        boolean whatsappPayslip) {
}
