package com.tinypayroll.backend.catalog.dto;

import com.tinypayroll.backend.employee.SalaryType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record UpdateDesignationRequest(
        Long departmentId,
        @NotBlank @Size(max = 100) String name,
        @DecimalMin(value = "0.0", inclusive = true) BigDecimal defaultSalary,
        SalaryType defaultSalaryType) {
}
