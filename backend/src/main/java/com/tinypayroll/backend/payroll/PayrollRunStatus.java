package com.tinypayroll.backend.payroll;

/**
 * Extends the app's PayrollStatus ('pending'/'paid'/'failed', src/types/index.ts) with a
 * DRAFT stage (PRD §5) — a run starts as DRAFT while items are being adjusted, moves to PENDING
 * once submitted for approval, then PAID on finalize (irreversible) or FAILED on payout error.
 */
public enum PayrollRunStatus {
    DRAFT,
    PENDING,
    PAID,
    FAILED
}
