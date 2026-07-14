package com.tinypayroll.backend.security;

import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Controller-layer convenience for reading the authenticated caller's identity off the
 * {@link UserPrincipal} that {@link JwtAuthFilter} placed in the security context. Controllers
 * use this instead of trusting any businessId/userId from the request body/path (PRD §4).
 */
public final class CurrentUser {

    private CurrentUser() {}

    public static UserPrincipal get() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!(principal instanceof UserPrincipal userPrincipal)) {
            throw new IllegalStateException("No authenticated UserPrincipal in security context");
        }
        return userPrincipal;
    }

    public static Long businessId() {
        return get().getBusinessId();
    }

    public static Long userId() {
        return get().getUserId();
    }
}
