package com.tinypayroll.backend.payroll;

import com.tinypayroll.backend.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/** One row per employee per PayrollRun. Mirrors src/types/index.ts PayrollRunItem. */
@Getter
@Setter
@Entity
@Table(
        name = "payroll_run_item",
        uniqueConstraints = @UniqueConstraint(name = "uk_payroll_item_run_employee", columnNames = {"payroll_run_id", "employee_id"}),
        indexes = @Index(name = "idx_payroll_item_run_id", columnList = "payroll_run_id"))
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = false)
@ToString
public class PayrollRunItem extends BaseEntity {

    @Column(name = "payroll_run_id", nullable = false)
    private Long payrollRunId;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal baseSalary;

    @Column(nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal overtime = BigDecimal.ZERO;

    @Column(nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal bonus = BigDecimal.ZERO;

    @Column(name = "unpaid_leave", nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal unpaidLeave = BigDecimal.ZERO;

    @Column(nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal advances = BigDecimal.ZERO;

    @Column(nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal deductions = BigDecimal.ZERO;

    @Column(name = "final_salary", nullable = false, precision = 14, scale = 2)
    private BigDecimal finalSalary;
}
