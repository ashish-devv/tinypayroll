package com.tinypayroll.backend.attendance;

import com.tinypayroll.backend.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * Mirrors src/types/index.ts AttendanceRecord (PRD §5). {@code business_id} is denormalized onto
 * the row (rather than derived via a join to Employee) purely for query/index efficiency on the
 * hot {@code GET /attendance?month=&year=} path — still always filtered explicitly, never trusted
 * from the client (PRD §4).
 *
 * <p>Unique constraint on (employee_id, date) gives upsert semantics: marking the same employee on
 * the same date twice updates the existing row rather than creating a duplicate.
 */
@Getter
@Setter
@Entity
@Table(
        name = "attendance_record",
        uniqueConstraints = @UniqueConstraint(name = "uk_attendance_employee_date", columnNames = {"employee_id", "date"}),
        indexes = {
            @Index(name = "idx_attendance_business_id_date", columnList = "business_id, date"),
            @Index(name = "idx_attendance_employee_id", columnList = "employee_id")
        })
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = false)
@ToString
public class AttendanceRecord extends BaseEntity {

    @Column(name = "business_id", nullable = false)
    private Long businessId;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Column(nullable = false)
    private LocalDate date;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AttendanceStatus status;

    /** Who marked/last edited this record — an {@code AppUser} id, for audit purposes. */
    @Column(name = "marked_by_user_id", nullable = false)
    private Long markedByUserId;

    private String note;
}
