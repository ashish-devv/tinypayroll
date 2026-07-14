package com.tinypayroll.backend.auth;

/** RBAC roles (PRD §6) enforced via @PreAuthorize at the service method level. */
public enum Role {
    OWNER,
    ADMIN,
    STAFF
}
