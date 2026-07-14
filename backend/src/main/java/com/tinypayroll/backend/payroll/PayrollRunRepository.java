package com.tinypayroll.backend.payroll;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PayrollRunRepository extends JpaRepository<PayrollRun, Long> {

    Optional<PayrollRun> findByIdAndBusinessId(Long id, Long businessId);

    Optional<PayrollRun> findByBusinessIdAndMonthAndYear(Long businessId, int month, int year);

    List<PayrollRun> findByBusinessIdOrderByYearDescMonthDesc(Long businessId);

    List<PayrollRun> findByBusinessIdAndRunDateBetweenOrderByRunDate(Long businessId, LocalDate from, LocalDate to);
}
