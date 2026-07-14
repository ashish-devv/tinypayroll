package com.tinypayroll.backend.attendance;

import com.tinypayroll.backend.attendance.dto.AttendanceResponse;
import com.tinypayroll.backend.attendance.dto.AttendanceSummaryResponse;
import com.tinypayroll.backend.attendance.dto.BulkMarkAttendanceRequest;
import com.tinypayroll.backend.attendance.dto.MarkAttendanceRequest;
import com.tinypayroll.backend.attendance.dto.UpdateAttendanceRequest;
import com.tinypayroll.backend.security.CurrentUser;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/attendance")
public class AttendanceController {

    private final AttendanceService attendanceService;

    public AttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    @GetMapping
    public List<AttendanceResponse> list(
            @RequestParam int month, @RequestParam int year, @RequestParam(required = false) Long employeeId) {
        return attendanceService.list(CurrentUser.businessId(), month, year, employeeId);
    }

    /** Accepts either a single record ({@link MarkAttendanceRequest} shape) or a batch (wrapped in "records"). */
    @PostMapping
    public ResponseEntity<?> mark(@Valid @RequestBody BulkMarkAttendanceRequest request) {
        List<AttendanceResponse> results =
                attendanceService.markBulk(CurrentUser.businessId(), CurrentUser.userId(), request.records());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(results.size() == 1 ? results.get(0) : results);
    }

    @PutMapping("/{id}")
    public AttendanceResponse update(@PathVariable Long id, @Valid @RequestBody UpdateAttendanceRequest request) {
        return attendanceService.update(id, CurrentUser.businessId(), CurrentUser.userId(), request);
    }

    @GetMapping("/summary")
    public AttendanceSummaryResponse summary(@RequestParam int month, @RequestParam int year) {
        return attendanceService.summary(CurrentUser.businessId(), month, year);
    }
}
