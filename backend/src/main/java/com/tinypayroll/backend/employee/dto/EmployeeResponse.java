package com.tinypayroll.backend.employee.dto;

import com.tinypayroll.backend.employee.EmployeeStatus;
import com.tinypayroll.backend.employee.SalaryType;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Never carries bankAccountNumber (PRD §5, §6) — mask it separately if ever needed. */
public record EmployeeResponse(
        Long id,
        String name,
        String role,
        BigDecimal baseSalary,
        SalaryType salaryType,
        String avatarUrl,
        EmployeeStatus status,
        LocalDate joinDate,
        String phone,
        String bankName,
        String ifscMasked,
        String bankAccountMasked) {
}
