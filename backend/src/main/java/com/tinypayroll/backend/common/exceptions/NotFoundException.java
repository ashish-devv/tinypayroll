package com.tinypayroll.backend.common.exceptions;

/** Thrown when a tenant-scoped lookup finds nothing — always maps to HTTP 404. */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }

    public static NotFoundException of(String entity, Object id) {
        return new NotFoundException(entity + " not found: " + id);
    }
}
