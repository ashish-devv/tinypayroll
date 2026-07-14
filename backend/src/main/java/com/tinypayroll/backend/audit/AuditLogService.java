package com.tinypayroll.backend.audit;

import java.time.Instant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
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
    public Page<AuditLog> list(Long businessId, Pageable pageable) {
        return auditLogRepository.findByBusinessIdOrderByCreatedAtDesc(businessId, pageable);
    }
}
