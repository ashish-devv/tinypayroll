package com.tinypayroll.backend.employee.dto;

import com.tinypayroll.backend.employee.EmployeeStatus;
import com.tinypayroll.backend.employee.SalaryType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public record UpdateEmployeeRequest(
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Size(max = 100) String role,
        @Size(max = 100) String department,
        Long departmentId,
        Long designationId,
        @NotNull @DecimalMin(value = "0.0", inclusive = true) BigDecimal baseSalary,
        @NotNull SalaryType salaryType,
        String avatarUrl,
        @NotNull EmployeeStatus status,
        @NotNull LocalDate joinDate,
        @Pattern(regexp = "^[+]?[0-9]{10,15}$", message = "Invalid phone number") String phone,
        String bankAccountNumber,
        String bankName,
        @Pattern(regexp = "^[A-Z]{4}0[A-Z0-9]{6}$", message = "Invalid IFSC format") String ifsc) {
}
