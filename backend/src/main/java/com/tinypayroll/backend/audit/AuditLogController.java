package com.tinypayroll.backend.audit;

import com.tinypayroll.backend.audit.dto.AuditLogResponse;
import com.tinypayroll.backend.common.PageResponse;
import com.tinypayroll.backend.security.CurrentUser;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Read-only feed of business-scoped audit events (dashboard "Recent Activity"). Ordering/tenant
 * scoping live in the service; the client just asks for a page.
 */
@RestController
@RequestMapping("/api/v1/audit-logs")
public class AuditLogController {

    private static final int MAX_SIZE = 100;

    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public PageResponse<AuditLogResponse> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), MAX_SIZE));
        return PageResponse.of(auditLogService.list(CurrentUser.businessId(), pageable));
    }
}
