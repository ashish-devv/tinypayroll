package com.tinypayroll.backend.common.exceptions;

/** Thrown by login when an account is locked out from brute-force protection (PRD §6) — HTTP 423. */
public class LockedAccountException extends RuntimeException {

    public LockedAccountException(String message) {
        super(message);
    }
}
