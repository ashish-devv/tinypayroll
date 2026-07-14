package com.tinypayroll.backend.attendance.dto;

import com.tinypayroll.backend.attendance.AttendanceStatus;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

/** One employee/date/status triple. Marking an existing (employeeId, date) pair upserts it. */
public record MarkAttendanceRequest(
        @NotNull Long employeeId,
        @NotNull LocalDate date,
        @NotNull AttendanceStatus status,
        String note) {
}
