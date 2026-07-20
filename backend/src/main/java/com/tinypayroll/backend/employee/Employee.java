package com.tinypayroll.backend.employee;

import com.tinypayroll.backend.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * Mirrors src/types/index.ts Employee + salary type + bank details (PRD §5).
 * {@code business_id} is a plain column (not a relation) to keep tenant-scoped queries simple —
 * every repository method takes it explicitly (PRD §4).
 */
@Getter
@Setter
@Entity
@Table(name = "employee", indexes = {@Index(name = "idx_employee_business_id", columnList = "business_id")})
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = false)
@ToString(exclude = "bankAccountNumber")
public class Employee extends BaseEntity {

    @Column(name = "business_id", nullable = false)
    private Long businessId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String role;

    /** Denormalized name (authoritative for payslips/reports); catalog link is a soft FK below. */
    private String department;

    /** Soft links to the catalog — not enforced relations; the name strings stay authoritative. */
    private Long departmentId;

    private Long designationId;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal baseSalary;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SalaryType salaryType = SalaryType.MONTHLY;

    private String avatarUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private EmployeeStatus status = EmployeeStatus.ACTIVE;

    @Column(nullable = false)
    private LocalDate joinDate;

    private String phone;

    /** AES-256-GCM encrypted at rest (PRD §6) — never returned in any DTO. */
    @Convert(converter = BankAccountEncryptor.class)
    @Column(name = "bank_account_number")
    private String bankAccountNumber;

    private String bankName;

    private String ifsc;
}
