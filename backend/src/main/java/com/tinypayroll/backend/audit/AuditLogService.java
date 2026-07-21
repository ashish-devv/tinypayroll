package com.tinypayroll.backend.audit;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tinypayroll.backend.audit.dto.AuditLogResponse;
import java.time.Instant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    // Fields we probe (in order) to derive a human-readable label from the audit row's new-value
    // JSON — covers Employee (name), PayrollRun (period), Business (companyName), Department/
    // Designation (name).
    private static final String[] LABEL_FIELDS = {"name", "period", "companyName", "title"};

    public AuditLogService(AuditLogRepository auditLogRepository, ObjectMapper objectMapper) {
        this.auditLogRepository = auditLogRepository;
        this.objectMapper = objectMapper;
    }

    // REQUIRES_NEW: runs on its own connection/transaction so a failure writing the audit trail
    // (e.g. a DB-level constraint issue) can never mark the caller's business-mutation transaction
    // rollback-only — audit logging must be best-effort, not a shared point of failure.
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(
            Long businessId, Long userId, String action, String entityType, Long entityId, String newValue, String ipAddress) {
        auditLogRepository.save(AuditLog.builder()
                .businessId(businessId)
                .userId(userId)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .newValue(newValue)
                .ipAddress(ipAddress)
                .createdAt(Instant.now())
                .build());
    }

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> list(Long businessId, Pageable pageable) {
        return auditLogRepository.findByBusinessIdOrderByCreatedAtDesc(businessId, pageable)
                .map(this::toResponse);
    }

    private AuditLogResponse toResponse(AuditLog log) {
        return new AuditLogResponse(
                log.getId(),
                log.getAction(),
                log.getEntityType(),
                log.getEntityId(),
                labelFrom(log.getNewValue()),
                log.getCreatedAt());
    }

    /** Best-effort extraction of a display name from the recorded new-value JSON; null if none. */
    private String labelFrom(String newValue) {
        if (newValue == null || newValue.isBlank()) {
            return null;
        }
        try {
            JsonNode node = objectMapper.readTree(newValue);
            for (String field : LABEL_FIELDS) {
                JsonNode value = node.get(field);
                if (value != null && value.isTextual() && !value.asText().isBlank()) {
                    return value.asText();
                }
            }
        } catch (Exception e) {
            // not JSON or unexpected shape — fall through to null, the client will phrase generically
        }
        return null;
    }
}
