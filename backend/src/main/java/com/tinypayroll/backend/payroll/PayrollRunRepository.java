package com.tinypayroll.backend.payroll;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PayrollRunRepository extends JpaRepository<PayrollRun, Long> {

    Optional<PayrollRun> findByIdAndBusinessIdAndDeletedAtIsNull(Long id, Long businessId);

    Optional<PayrollRun> findByBusinessIdAndMonthAndYearAndDeletedAtIsNull(Long businessId, int month, int year);

    List<PayrollRun> findByBusinessIdAndDeletedAtIsNullOrderByYearDescMonthDesc(Long businessId);

    List<PayrollRun> findByBusinessIdAndRunDateBetweenAndDeletedAtIsNullOrderByRunDate(Long businessId, LocalDate from, LocalDate to);
}
