package com.tinypayroll.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Creates a new Business + its OWNER AppUser in one call (PRD §8). */
public record SignupRequest(
        @NotBlank @Size(max = 150) String companyName,
        @NotBlank @Size(max = 100) String ownerName,
        @NotBlank @Email @Size(max = 150) String email,
        @NotBlank @Size(min = 8, max = 100) String password) {
}
