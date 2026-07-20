package com.tinypayroll.backend.catalog.dto;

import com.tinypayroll.backend.employee.SalaryType;
import java.math.BigDecimal;

public record DesignationResponse(Long id, Long departmentId, String name,
                                  BigDecimal defaultSalary, SalaryType defaultSalaryType) {
}
