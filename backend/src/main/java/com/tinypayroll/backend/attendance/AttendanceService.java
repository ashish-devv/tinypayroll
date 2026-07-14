package com.tinypayroll.backend.attendance;

import com.tinypayroll.backend.attendance.dto.AttendanceResponse;
import com.tinypayroll.backend.attendance.dto.AttendanceSummaryResponse;
import com.tinypayroll.backend.attendance.dto.AttendanceSummaryResponse.EmployeeAttendanceSummary;
import com.tinypayroll.backend.attendance.dto.MarkAttendanceRequest;
import com.tinypayroll.backend.attendance.dto.UpdateAttendanceRequest;
import com.tinypayroll.backend.attendance.mapper.AttendanceMapper;
import com.tinypayroll.backend.common.exceptions.NotFoundException;
import com.tinypayroll.backend.employee.Employee;
import com.tinypayroll.backend.employee.EmployeeRepository;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Mark: STAFF+. Edit past entries: ADMIN+ (PRD §8). Tenant scoping enforced on every query (PRD §4). */
@Service
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;
    private final AttendanceMapper attendanceMapper;

    public AttendanceService(
            AttendanceRepository attendanceRepository,
            EmployeeRepository employeeRepository,
            AttendanceMapper attendanceMapper) {
        this.attendanceRepository = attendanceRepository;
        this.employeeRepository = employeeRepository;
        this.attendanceMapper = attendanceMapper;
    }

    @Transactional(readOnly = true)
    public List<AttendanceResponse> list(Long businessId, int month, int year, Long employeeId) {
        YearMonth period = YearMonth.of(year, month);
        LocalDate from = period.atDay(1);
        LocalDate to = period.atEndOfMonth();
        List<AttendanceRecord> records = employeeId == null
                ? attendanceRepository.findByBusinessIdAndDateBetween(businessId, from, to)
                : attendanceRepository.findByBusinessIdAndEmployeeIdAndDateBetween(businessId, employeeId, from, to);
        return records.stream().map(attendanceMapper::toResponse).toList();
    }

    @PreAuthorize("hasAnyRole('OWNER','ADMIN','STAFF')")
    @Transactional
    public AttendanceResponse mark(Long businessId, Long markedByUserId, MarkAttendanceRequest request) {
        return attendanceMapper.toResponse(upsert(businessId, markedByUserId, request));
    }

    @PreAuthorize("hasAnyRole('OWNER','ADMIN','STAFF')")
    @Transactional
    public List<AttendanceResponse> markBulk(Long businessId, Long markedByUserId, List<MarkAttendanceRequest> requests) {
        return requests.stream()
                .map(request -> attendanceMapper.toResponse(upsert(businessId, markedByUserId, request)))
                .toList();
    }

    /** ADMIN+ only — editing a past entry (PRD §8), enforced separately from marking today's attendance. */
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    @Transactional
    public AttendanceResponse update(Long id, Long businessId, Long markedByUserId, UpdateAttendanceRequest request) {
        AttendanceRecord record = attendanceRepository
                .findByIdAndBusinessId(id, businessId)
                .orElseThrow(() -> NotFoundException.of("AttendanceRecord", id));
        record.setStatus(request.status());
        record.setNote(request.note());
        record.setMarkedByUserId(markedByUserId);
        return attendanceMapper.toResponse(attendanceRepository.save(record));
    }

    @Transactional(readOnly = true)
    public AttendanceSummaryResponse summary(Long businessId, int month, int year) {
        YearMonth period = YearMonth.of(year, month);
        LocalDate from = period.atDay(1);
        LocalDate to = period.atEndOfMonth();

        List<Employee> employees = employeeRepository.findByBusinessId(businessId);
        List<AttendanceRecord> records = attendanceRepository.findByBusinessIdAndDateBetween(businessId, from, to);
        Map<Long, List<AttendanceRecord>> byEmployee =
                records.stream().collect(Collectors.groupingBy(AttendanceRecord::getEmployeeId));

        List<EmployeeAttendanceSummary> summaries = employees.stream()
                .map(employee -> {
                    Map<AttendanceStatus, Long> counts = countByStatus(
                            byEmployee.getOrDefault(employee.getId(), List.of()));
                    return new EmployeeAttendanceSummary(
                            employee.getId(),
                            employee.getName(),
                            counts.getOrDefault(AttendanceStatus.PRESENT, 0L),
                            counts.getOrDefault(AttendanceStatus.ABSENT, 0L),
                            counts.getOrDefault(AttendanceStatus.LEAVE, 0L),
                            counts.getOrDefault(AttendanceStatus.HOLIDAY, 0L),
                            counts.getOrDefault(AttendanceStatus.WEEKEND, 0L));
                })
                .toList();

        return new AttendanceSummaryResponse(month, year, summaries);
    }

    private Map<AttendanceStatus, Long> countByStatus(List<AttendanceRecord> records) {
        Map<AttendanceStatus, Long> counts = new EnumMap<>(AttendanceStatus.class);
        for (AttendanceRecord record : records) {
            counts.merge(record.getStatus(), 1L, Long::sum);
        }
        return counts;
    }

    /** Upsert on (business_id, employee_id, date) — marking twice updates rather than duplicates. */
    private AttendanceRecord upsert(Long businessId, Long markedByUserId, MarkAttendanceRequest request) {
        // Guard against marking attendance for another tenant's employee.
        employeeRepository
                .findByIdAndBusinessId(request.employeeId(), businessId)
                .orElseThrow(() -> NotFoundException.of("Employee", request.employeeId()));

        AttendanceRecord record = attendanceRepository
                .findByBusinessIdAndEmployeeIdAndDate(businessId, request.employeeId(), request.date())
                .orElseGet(() -> AttendanceRecord.builder()
                        .businessId(businessId)
                        .employeeId(request.employeeId())
                        .date(request.date())
                        .build());

        record.setStatus(request.status());
        record.setNote(request.note());
        record.setMarkedByUserId(markedByUserId);
        return attendanceRepository.save(record);
    }
}
