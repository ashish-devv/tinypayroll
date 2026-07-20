package com.tinypayroll.backend.catalog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateDepartmentRequest(@NotBlank @Size(max = 100) String name) {
}
