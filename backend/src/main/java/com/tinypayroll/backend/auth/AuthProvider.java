package com.tinypayroll.backend.auth;

/** How the AppUser authenticates. GOOGLE is wired for Phase 1.5 OAuth (PRD §6) but unused until then. */
public enum AuthProvider {
    LOCAL,
    GOOGLE
}
