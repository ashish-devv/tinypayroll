package com.tinypayroll.backend.catalog;

import com.tinypayroll.backend.common.BaseEntity;
import com.tinypayroll.backend.employee.SalaryType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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

/**
 * Per-business designation (role) catalog. Name unique per tenant.
 * Optional default salary + type pre-fills the employee form; employees keep the name as a string.
 */
@Getter
@Setter
@Entity
@Table(
        name = "designation",
        uniqueConstraints = @UniqueConstraint(name = "uq_designation_business_name", columnNames = {"business_id", "name"}),
        indexes = @Index(name = "idx_designation_business_id", columnList = "business_id"))
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = false)
@ToString
public class Designation extends BaseEntity {

    @Column(name = "business_id", nullable = false)
    private Long businessId;

    /** Owning department (nullable — a role can be unassigned). */
    @Column(name = "department_id")
    private Long departmentId;

    @Column(nullable = false)
    private String name;

    /** Nullable — pre-fills the employee Base Amount when set. */
    @Column(precision = 12, scale = 2)
    private BigDecimal defaultSalary;

    @Enumerated(EnumType.STRING)
    private SalaryType defaultSalaryType;
}
