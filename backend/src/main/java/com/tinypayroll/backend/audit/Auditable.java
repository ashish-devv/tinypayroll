package com.tinypayroll.backend.audit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** Marks a service method as a mutation worth recording (PRD §5) — picked up by {@link AuditAspect}. */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface Auditable {

    /** e.g. "CREATE_EMPLOYEE", "FINALIZE_PAYROLL_RUN". */
    String action();

    /** e.g. "Employee", "PayrollRun". */
    String entityType();
}
