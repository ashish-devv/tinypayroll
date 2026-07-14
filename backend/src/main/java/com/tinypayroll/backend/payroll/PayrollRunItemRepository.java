package com.tinypayroll.backend.payroll;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PayrollRunItemRepository extends JpaRepository<PayrollRunItem, Long> {

    List<PayrollRunItem> findByPayrollRunId(Long payrollRunId);

    Optional<PayrollRunItem> findByIdAndPayrollRunId(Long id, Long payrollRunId);

    Optional<PayrollRunItem> findByPayrollRunIdAndEmployeeId(Long payrollRunId, Long employeeId);
}
