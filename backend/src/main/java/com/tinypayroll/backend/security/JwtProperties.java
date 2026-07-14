package com.tinypayroll.backend.security;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Type-safe JWT config (PRD §7) — validated at startup, fails fast on misconfiguration.
 * {@code secret} must come from an env var in every environment; no default in prod.
 */
@Validated
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(
        @NotBlank String secret,
        @Positive long accessTokenTtlMinutes,
        @Positive long refreshTokenTtlDays,
        @NotBlank String issuer) {
}
