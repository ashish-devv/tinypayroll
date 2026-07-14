package com.tinypayroll.backend.attendance.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

/** POST /api/v1/attendance accepts either a single record or a batch via this wrapper. */
public record BulkMarkAttendanceRequest(@NotEmpty @Valid List<MarkAttendanceRequest> records) {
}
