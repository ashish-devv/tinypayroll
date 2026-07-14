package com.tinypayroll.backend.audit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tinypayroll.backend.tenant.TenantContext;
import java.lang.reflect.Method;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Fires after a {@link Auditable}-annotated service method returns successfully — logs action +
 * new state only. ponytail: no before/after diff (oldValue always null); add real diffing when an
 * audit review actually needs it, not speculatively.
 */
@Slf4j
@Aspect
@Component
public class AuditAspect {

    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper;

    public AuditAspect(AuditLogService auditLogService, ObjectMapper objectMapper) {
        this.auditLogService = auditLogService;
        this.objectMapper = objectMapper;
    }

    @Around("@annotation(auditable)")
    public Object audit(ProceedingJoinPoint joinPoint, Auditable auditable) throws Throwable {
        Object result = joinPoint.proceed();
        try {
            auditLogService.record(
                    TenantContext.getBusinessId(),
                    currentUserIdOrNull(),
                    auditable.action(),
                    auditable.entityType(),
                    extractId(result),
                    objectMapper.writeValueAsString(result),
                    currentIpOrNull());
        } catch (Exception e) {
            // ponytail: audit logging must never fail the underlying mutation — but still surface
            // it in logs. AuditLogService.record runs in its own REQUIRES_NEW transaction, so a
            // failure here can no longer poison the caller's transaction (was previously marking
            // it rollback-only via IDENTITY's eager INSERT, causing a silently swallowed root cause
            // and a generic UnexpectedRollbackException at the caller's commit).
            log.warn("Audit logging failed for action={} entityType={}", auditable.action(), auditable.entityType(), e);
        }
        return result;
    }

    private Long currentUserIdOrNull() {
        try {
            Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            Method getUserId = principal.getClass().getMethod("getUserId");
            return (Long) getUserId.invoke(principal);
        } catch (Exception e) {
            return null;
        }
    }

    private String currentIpOrNull() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            return attrs.getRequest().getRemoteAddr();
        }
        return null;
    }

    private Long extractId(Object result) {
        try {
            Method getId = result.getClass().getMethod("getId");
            return (Long) getId.invoke(result);
        } catch (Exception e) {
            return null;
        }
    }
}
