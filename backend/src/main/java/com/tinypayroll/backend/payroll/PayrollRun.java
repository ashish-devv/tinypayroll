package com.tinypayroll.backend.payroll;

import com.tinypayroll.backend.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * Mirrors src/types/index.ts PayrollRun (PRD §5). One run per (business, month, year) — the
 * unique constraint below is what makes "create DRAFT for a period" idempotent-by-rejection
 * rather than silently creating duplicates.
 */
@Getter
@Setter
@Entity
@Table(
        name = "payroll_run",
        uniqueConstraints = @UniqueConstraint(name = "uk_payroll_run_period", columnNames = {"business_id", "month", "year"}),
        indexes = @Index(name = "idx_payroll_run_business_id", columnList = "business_id"))
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = false)
@ToString
public class PayrollRun extends BaseEntity {

    @Column(name = "business_id", nullable = false)
    private Long businessId;

    /** Human-readable period, e.g. "June 2026" — matches app's PayrollRun.period exactly. */
    @Column(nullable = false)
    private String period;

    @Column(nullable = false)
    private int month;

    @Column(nullable = false)
    private int year;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private PayrollRunStatus status = PayrollRunStatus.DRAFT;

    @Column(nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(nullable = false)
    private LocalDate runDate;

    private Instant paidAt;

    @Column(name = "created_by_user_id", nullable = false)
    private Long createdByUserId;
}
