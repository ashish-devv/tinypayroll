package com.tinypayroll.backend.report;

import com.tinypayroll.backend.attendance.AttendanceService;
import com.tinypayroll.backend.attendance.dto.AttendanceSummaryResponse;
import com.tinypayroll.backend.payroll.PayrollRun;
import com.tinypayroll.backend.payroll.PayrollRunRepository;
import com.tinypayroll.backend.report.dto.ExpenseSummaryResponse;
import com.tinypayroll.backend.report.dto.ExpenseSummaryResponse.PeriodExpense;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Aggregation queries over already-persisted payroll/attendance data (PRD §8). CSV export lives
 * here; PDF export (rendering) is handled by {@link ReportPdfService}, fed by {@link #expenseSummary}.
 */
@Service
public class ReportService {

    private final PayrollRunRepository payrollRunRepository;
    private final AttendanceService attendanceService;

    public ReportService(PayrollRunRepository payrollRunRepository, AttendanceService attendanceService) {
        this.payrollRunRepository = payrollRunRepository;
        this.attendanceService = attendanceService;
    }

    @Transactional(readOnly = true)
    public ExpenseSummaryResponse expenseSummary(Long businessId, LocalDate from, LocalDate to) {
        List<PayrollRun> runs = payrollRunRepository.findByBusinessIdAndRunDateBetweenAndDeletedAtIsNullOrderByRunDate(businessId, from, to);
        List<PeriodExpense> periods = runs.stream()
                .map(run -> new PeriodExpense(run.getPeriod(), run.getRunDate(), run.getTotalAmount(), run.getStatus().name()))
                .toList();
        BigDecimal total = runs.stream().map(PayrollRun::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new ExpenseSummaryResponse(from, to, total, periods);
    }

    @Transactional(readOnly = true)
    public AttendanceSummaryResponse attendanceSummary(Long businessId, int month, int year) {
        return attendanceService.summary(businessId, month, year);
    }

    /** Payroll-run expense CSV — one row per period. */
    @Transactional(readOnly = true)
    public String expenseSummaryCsv(Long businessId, LocalDate from, LocalDate to) {
        List<PayrollRun> runs = payrollRunRepository.findByBusinessIdAndRunDateBetweenAndDeletedAtIsNullOrderByRunDate(businessId, from, to);
        StringBuilder csv = new StringBuilder("period,runDate,status,totalAmount\n");
        for (PayrollRun run : runs) {
            csv.append(run.getPeriod())
                    .append(',')
                    .append(run.getRunDate())
                    .append(',')
                    .append(run.getStatus())
                    .append(',')
                    .append(run.getTotalAmount())
                    .append('\n');
        }
        return csv.toString();
    }
}
