package com.tinypayroll.backend.audit.dto;

import java.time.Instant;

/**
 * Wire shape for the Recent Activity feed (dashboard). {@code action}/{@code entityType} drive the
 * icon + phrasing on the client; {@code entityLabel} is the best human-readable name/period pulled
 * out of the audit row's JSON new-value (e.g. the employee's name or the payroll period).
 */
public record AuditLogResponse(
        Long id,
        String action,
        String entityType,
        Long entityId,
        String entityLabel,
        Instant createdAt) {}
