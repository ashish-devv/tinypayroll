package com.tinypayroll.backend.attendance;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AttendanceRepository extends JpaRepository<AttendanceRecord, Long> {

    Optional<AttendanceRecord> findByIdAndBusinessId(Long id, Long businessId);

    Optional<AttendanceRecord> findByBusinessIdAndEmployeeIdAndDate(Long businessId, Long employeeId, LocalDate date);

    List<AttendanceRecord> findByBusinessIdAndDateBetween(Long businessId, LocalDate from, LocalDate to);

    List<AttendanceRecord> findByBusinessIdAndEmployeeIdAndDateBetween(
            Long businessId, Long employeeId, LocalDate from, LocalDate to);
}
