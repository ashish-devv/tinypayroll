package com.tinypayroll.backend.common.exceptions;

/**
 * Thrown when an authenticated caller is scoped correctly but not permitted to perform the
 * action (business-rule level, distinct from Spring Security's method-level @PreAuthorize
 * denials which are handled by AccessDeniedHandler) — HTTP 403.
 */
public class ForbiddenException extends RuntimeException {

    public ForbiddenException(String message) {
        super(message);
    }
}
