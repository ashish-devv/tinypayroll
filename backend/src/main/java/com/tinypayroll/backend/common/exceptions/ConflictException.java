package com.tinypayroll.backend.common.exceptions;

/** Thrown on a uniqueness/state conflict (e.g. duplicate email, duplicate payroll period) — HTTP 409. */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
