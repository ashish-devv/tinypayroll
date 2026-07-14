package com.tinypayroll.backend.auth.dto;

/** Never carries passwordHash or any other sensitive AppUser field. */
public record TokenResponse(
        String accessToken,
        String refreshToken,
        long expiresInSeconds,
        Long userId,
        Long businessId,
        String name,
        String email,
        String role) {
}
