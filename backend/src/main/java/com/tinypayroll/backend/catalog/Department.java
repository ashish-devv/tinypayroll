package com.tinypayroll.backend.catalog;

import com.tinypayroll.backend.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/** Per-business department catalog. Name unique per tenant. Employees keep the name as a string. */
@Getter
@Setter
@Entity
@Table(
        name = "department",
        uniqueConstraints = @UniqueConstraint(name = "uq_department_business_name", columnNames = {"business_id", "name"}),
        indexes = @Index(name = "idx_department_business_id", columnList = "business_id"))
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = false)
@ToString
public class Department extends BaseEntity {

    @Column(name = "business_id", nullable = false)
    private Long businessId;

    @Column(nullable = false)
    private String name;
}
