package com.tinypayroll.backend.attendance.dto;

import com.tinypayroll.backend.attendance.AttendanceStatus;
import java.time.LocalDate;

public record AttendanceResponse(
        Long id,
        Long employeeId,
        LocalDate date,
        AttendanceStatus status,
        Long markedByUserId,
        String note) {
}
