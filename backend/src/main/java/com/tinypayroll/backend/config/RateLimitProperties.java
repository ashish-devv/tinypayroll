package com.tinypayroll.backend.config;

import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/** Bucket4j settings for rate-limiting /auth/** regardless of account state (PRD §6). */
@Validated
@ConfigurationProperties(prefix = "app.rate-limit")
public record RateLimitProperties(@Positive long capacity, @Positive long refillTokens, @Positive long refillPeriodSeconds) {
}
