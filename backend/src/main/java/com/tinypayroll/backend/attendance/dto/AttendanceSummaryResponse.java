package com.tinypayroll.backend.attendance.dto;

import java.util.List;

/** GET /api/v1/attendance/summary?month=&year= — per-employee status counts for the period. */
public record AttendanceSummaryResponse(int month, int year, List<EmployeeAttendanceSummary> employees) {

    public record EmployeeAttendanceSummary(
            Long employeeId,
            String employeeName,
            long presentDays,
            long absentDays,
            long leaveDays,
            long holidayDays,
            long weekendDays) {
    }
}
