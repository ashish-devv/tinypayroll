package com.tinypayroll.backend.attendance.dto;

import com.tinypayroll.backend.attendance.AttendanceStatus;
import jakarta.validation.constraints.NotNull;

/** PUT /api/v1/attendance/{id} — ADMIN+ editing a past entry (PRD §8). */
public record UpdateAttendanceRequest(@NotNull AttendanceStatus status, String note) {
}
