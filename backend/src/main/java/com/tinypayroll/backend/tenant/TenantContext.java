package com.tinypayroll.backend.tenant;

/**
 * Holds the current request's {@code businessId}, populated by {@code JwtAuthFilter} from the
 * authenticated JWT's claims (PRD §4). Service methods pull tenant scope from here — never
 * from a client-supplied businessId in the request body/path.
 *
 * <p>Backed by a {@link ThreadLocal}; must be cleared at the end of every request (see
 * {@code JwtAuthFilter}) to avoid leaking tenant context across pooled request threads.
 */
public final class TenantContext {

    private static final ThreadLocal<Long> CURRENT_BUSINESS_ID = new ThreadLocal<>();

    private TenantContext() {}

    public static void setBusinessId(Long businessId) {
        CURRENT_BUSINESS_ID.set(businessId);
    }

    public static Long getBusinessId() {
        Long businessId = CURRENT_BUSINESS_ID.get();
        if (businessId == null) {
            throw new IllegalStateException("No tenant context set for current request");
        }
        return businessId;
    }

    public static void clear() {
        CURRENT_BUSINESS_ID.remove();
    }
}
