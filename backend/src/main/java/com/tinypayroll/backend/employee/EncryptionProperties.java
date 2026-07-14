package com.tinypayroll.backend.employee;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * AES-256-GCM key for field-level encryption at rest (PRD §6, §7) — base64-encoded 32-byte
 * key, from env/secrets manager, never hardcoded.
 */
@Validated
@ConfigurationProperties(prefix = "app.encryption")
public record EncryptionProperties(@NotBlank String key) {
}
