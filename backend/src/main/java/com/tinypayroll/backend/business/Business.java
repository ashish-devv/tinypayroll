package com.tinypayroll.backend.business;

import com.tinypayroll.backend.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * Tenant root (PRD §4, §5). One row per signed-up business — doubles as the app's
 * {@code BusinessConfig} type (company profile + payroll settings), which is what makes
 * payroll configurable per business without any code change per tenant.
 */
@Getter
@Setter
@Entity
@Table(name = "business")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = false)
@ToString
public class Business extends BaseEntity {

    @Column(nullable = false)
    private String companyName;

    private String industry;

    /** Validated format enforced by Bean Validation on the request DTO, not here. */
    private String gstin;

    private String address;

    private String email;

    private String phone;

    @Column(nullable = false)
    @Builder.Default
    private String currency = "INR";

    @Column(nullable = false)
    @Builder.Default
    private String currencySymbol = "₹";

    /** Day of month, 1-31. */
    @Column(nullable = false)
    @Builder.Default
    private int payDay = 1;

    @Column(nullable = false)
    @Builder.Default
    private int workingDaysPerMonth = 26;

    /** Overtime multiplier, e.g. 1.5. */
    @Column(nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal otRate = new BigDecimal("1.5");

    @Column(nullable = false)
    @Builder.Default
    private boolean autoReminders = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean whatsappPayslip = false;

    /** Soft-disable a tenant without deleting its data. */
    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;
}
