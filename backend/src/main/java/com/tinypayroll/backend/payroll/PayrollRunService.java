package com.tinypayroll.backend.payroll;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Month;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tinypayroll.backend.attendance.AttendanceRecord;
import com.tinypayroll.backend.attendance.AttendanceRepository;
import com.tinypayroll.backend.attendance.AttendanceStatus;
import com.tinypayroll.backend.audit.Auditable;
import com.tinypayroll.backend.business.Business;
import com.tinypayroll.backend.business.BusinessRepository;
import com.tinypayroll.backend.common.exceptions.ConflictException;
import com.tinypayroll.backend.common.exceptions.NotFoundException;
import com.tinypayroll.backend.employee.Employee;
import com.tinypayroll.backend.employee.EmployeeRepository;
import com.tinypayroll.backend.employee.SalaryType;
import com.tinypayroll.backend.payroll.dto.CreatePayrollRunRequest;
import com.tinypayroll.backend.payroll.dto.PayrollAdjustment;
import com.tinypayroll.backend.payroll.dto.PayrollRunItemResponse;
import com.tinypayroll.backend.payroll.dto.PayrollRunResponse;
import com.tinypayroll.backend.payroll.dto.PayrollRunSummaryResponse;
import com.tinypayroll.backend.payroll.dto.PayslipResponse;

/**
 * Draft creation auto-seeds items from attendance (PRD §8): unpaidLeave = absentDays × dailyRate,
 * where dailyRate = baseSalary / business.workingDaysPerMonth for MONTHLY employees, or baseSalary
 * itself for DAILY employees. LEAVE status is treated as paid (matches attendance.tsx legend
 * "Paid Leave") so only ABSENT days count. Overtime/bonus/advances/deductions start at zero for
 * manual adjustment before finalize.
 */
@Service
public class PayrollRunService {

    private final PayrollRunRepository payrollRunRepository;
    private final PayrollRunItemRepository payrollRunItemRepository;
    private final EmployeeRepository employeeRepository;
    private final AttendanceRepository attendanceRepository;
    private final BusinessRepository businessRepository;
    private final PayrollCalculationService calculationService;

    public PayrollRunService(
            PayrollRunRepository payrollRunRepository,
            PayrollRunItemRepository payrollRunItemRepository,
            EmployeeRepository employeeRepository,
            AttendanceRepository attendanceRepository,
            BusinessRepository businessRepository,
            PayrollCalculationService calculationService) {
        this.payrollRunRepository = payrollRunRepository;
        this.payrollRunItemRepository = payrollRunItemRepository;
        this.employeeRepository = employeeRepository;
        this.attendanceRepository = attendanceRepository;
        this.businessRepository = businessRepository;
        this.calculationService = calculationService;
    }

    @Transactional(readOnly = true)
    public List<PayrollRunSummaryResponse> list(Long businessId) {
        return payrollRunRepository.findByBusinessIdAndDeletedAtIsNullOrderByYearDescMonthDesc(businessId).stream()
                .map(run -> new PayrollRunSummaryResponse(
                        run.getId(),
                        run.getPeriod(),
                        run.getMonth(),
                        run.getYear(),
                        run.getStatus(),
                        run.getTotalAmount(),
                        run.getRunDate(),
                        payrollRunItemRepository.findByPayrollRunId(run.getId()).size()))
                .toList();
    }

    @Transactional(readOnly = true)
    public PayrollRunResponse get(Long id, Long businessId) {
        PayrollRun run = findRun(id, businessId);
        return toResponse(run, employeesById(businessId));
    }

    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    @Auditable(action = "CREATE_PAYROLL_RUN", entityType = "PayrollRun")
    @Transactional
    public PayrollRunResponse create(Long businessId, Long createdByUserId, CreatePayrollRunRequest request) {
        payrollRunRepository
                .findByBusinessIdAndMonthAndYearAndDeletedAtIsNull(businessId, request.month(), request.year())
                .ifPresent(existing -> {
                    throw new ConflictException(
                            "Payroll run already exists for " + request.month() + "/" + request.year());
                });

        Business business = businessRepository
                .findByIdAndActiveTrue(businessId)
                .orElseThrow(() -> NotFoundException.of("Business", businessId));

        YearMonth period = YearMonth.of(request.year(), request.month());
        String periodLabel = Month.of(request.month()).getDisplayName(TextStyle.FULL, Locale.ENGLISH) + " " + request.year();
        LocalDate runDate = period.plusMonths(1).atDay(Math.min(business.getPayDay(), period.plusMonths(1).lengthOfMonth()));
        PayrollRun run = payrollRunRepository.save(PayrollRun.builder()
                .businessId(businessId)
                .period(periodLabel)
                .month(request.month())
                .year(request.year())
                .runDate(runDate)
                .createdByUserId(createdByUserId)
                .build());

        List<Employee> employees = employeeRepository.findByBusinessId(businessId);
        Map<Long, List<AttendanceRecord>> attendanceByEmployee = attendanceRepository
                .findByBusinessIdAndDateBetween(businessId, period.atDay(1), period.atEndOfMonth())
                .stream()
                .collect(Collectors.groupingBy(AttendanceRecord::getEmployeeId));

        BigDecimal total = BigDecimal.ZERO;
        for (Employee employee : employees) {
            long absentDays = attendanceByEmployee.getOrDefault(employee.getId(), List.of()).stream()
                    .filter(record -> record.getStatus() == AttendanceStatus.ABSENT)
                    .count();
            BigDecimal dailyRate = employee.getSalaryType() == SalaryType.DAILY
                    ? employee.getBaseSalary()
                    : employee.getBaseSalary().divide(BigDecimal.valueOf(business.getWorkingDaysPerMonth()), 2, RoundingMode.HALF_UP);
            BigDecimal unpaidLeave = dailyRate.multiply(BigDecimal.valueOf(absentDays));
            BigDecimal finalSalary = calculationService.calculateFinalSalary(
                    employee.getBaseSalary(), BigDecimal.ZERO, BigDecimal.ZERO, unpaidLeave, BigDecimal.ZERO, BigDecimal.ZERO);

            payrollRunItemRepository.save(PayrollRunItem.builder()
                    .payrollRunId(run.getId())
                    .employeeId(employee.getId())
                    .baseSalary(employee.getBaseSalary())
                    .unpaidLeave(unpaidLeave)
                    .finalSalary(finalSalary)
                    .build());
            total = total.add(finalSalary);
        }

        run.setTotalAmount(total);
        payrollRunRepository.save(run);
        return toResponse(run, employeesById(businessId));
    }

    /** Pre-finalize only — items on a PAID run are locked. */
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    @Auditable(action = "ADJUST_PAYROLL_ITEM", entityType = "PayrollRunItem")
    @Transactional
    public PayrollRunResponse adjustItem(Long runId, Long itemId, Long businessId, PayrollAdjustment adjustment) {
        PayrollRun run = findRun(runId, businessId);
        if (run.getStatus() == PayrollRunStatus.PAID) {
            throw new ConflictException("Cannot adjust items on a finalized payroll run");
        }
        PayrollRunItem item = payrollRunItemRepository
                .findByIdAndPayrollRunId(itemId, runId)
                .orElseThrow(() -> NotFoundException.of("PayrollRunItem", itemId));

        item.setOvertime(adjustment.overtime());
        item.setBonus(adjustment.bonus());
        item.setUnpaidLeave(adjustment.unpaidLeave());
        item.setAdvances(adjustment.advances());
        item.setDeductions(adjustment.deductions());
        item.setFinalSalary(calculationService.calculateFinalSalary(
                item.getBaseSalary(),
                adjustment.overtime(),
                adjustment.bonus(),
                adjustment.unpaidLeave(),
                adjustment.advances(),
                adjustment.deductions()));
        payrollRunItemRepository.save(item);

        BigDecimal total = payrollRunItemRepository.findByPayrollRunId(runId).stream()
                .map(PayrollRunItem::getFinalSalary)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        run.setTotalAmount(total);
        payrollRunRepository.save(run);
        return toResponse(run, employeesById(businessId));
    }

    /** Irreversible — moves DRAFT/PENDING to PAID and stamps paidAt. */
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    @Auditable(action = "FINALIZE_PAYROLL_RUN", entityType = "PayrollRun")
    @Transactional
    public PayrollRunResponse finalizeRun(Long runId, Long businessId) {
        PayrollRun run = findRun(runId, businessId);
        if (run.getStatus() == PayrollRunStatus.PAID) {
            throw new ConflictException("Payroll run is already finalized");
        }
        run.setStatus(PayrollRunStatus.PAID);
        run.setPaidAt(Instant.now());
        payrollRunRepository.save(run);
        return toResponse(run, employeesById(businessId));
    }

    /** Soft-delete — stamps deletedAt so the run is hidden from list/get/reports. Any status. */
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    @Auditable(action = "DELETE_PAYROLL_RUN", entityType = "PayrollRun")
    @Transactional
    public void delete(Long runId, Long businessId) {
        PayrollRun run = findRun(runId, businessId);
        run.setDeletedAt(Instant.now());
        payrollRunRepository.save(run);
    }

    @Transactional(readOnly = true)
    public PayslipResponse payslip(Long runId, Long employeeId, Long businessId) {
        PayrollRun run = findRun(runId, businessId);
        PayrollRunItem item = payrollRunItemRepository
                .findByPayrollRunIdAndEmployeeId(runId, employeeId)
                .orElseThrow(() -> NotFoundException.of("PayrollRunItem", employeeId));
        Employee employee = employeeRepository
                .findByIdAndBusinessId(employeeId, businessId)
                .orElseThrow(() -> NotFoundException.of("Employee", employeeId));
        Business business = businessRepository
                .findByIdAndActiveTrue(businessId)
                .orElseThrow(() -> NotFoundException.of("Business", businessId));

        return new PayslipResponse(
                business.getCompanyName(),
                business.getAddress(),
                run.getPeriod(),
                run.getRunDate(),
                business.getCurrencySymbol(),
                employee.getId(),
                employee.getName(),
                employee.getRole(),
                initials(employee.getName()),
                item.getBaseSalary(),
                item.getOvertime(),
                item.getBonus(),
                item.getUnpaidLeave(),
                item.getAdvances(),
                item.getDeductions(),
                item.getFinalSalary());
    }

    private PayrollRun findRun(Long id, Long businessId) {
        return payrollRunRepository
                .findByIdAndBusinessIdAndDeletedAtIsNull(id, businessId)
                .orElseThrow(() -> NotFoundException.of("PayrollRun", id));
    }

    private Map<Long, Employee> employeesById(Long businessId) {
        return employeeRepository.findByBusinessId(businessId).stream()
                .collect(Collectors.toMap(Employee::getId, e -> e));
    }

    private PayrollRunResponse toResponse(PayrollRun run, Map<Long, Employee> employeesById) {
        List<PayrollRunItemResponse> items = payrollRunItemRepository.findByPayrollRunId(run.getId()).stream()
                .map(item -> {
                    Employee employee = employeesById.get(item.getEmployeeId());
                    return new PayrollRunItemResponse(
                            item.getId(),
                            item.getEmployeeId(),
                            employee != null ? employee.getName() : null,
                            employee != null ? initials(employee.getName()) : null,
                            item.getBaseSalary(),
                            item.getOvertime(),
                            item.getBonus(),
                            item.getUnpaidLeave(),
                            item.getAdvances(),
                            item.getDeductions(),
                            item.getFinalSalary());
                })
                .toList();
        return new PayrollRunResponse(
                run.getId(),
                run.getPeriod(),
                run.getMonth(),
                run.getYear(),
                run.getStatus(),
                run.getTotalAmount(),
                run.getRunDate(),
                run.getPaidAt(),
                items);
    }

    private String initials(String name) {
        if (name == null || name.isBlank()) {
            return "";
        }
        String[] parts = name.trim().split("\\s+");
        String first = parts[0].substring(0, 1);
        String last = parts.length > 1 ? parts[parts.length - 1].substring(0, 1) : "";
        return (first + last).toUpperCase(Locale.ENGLISH);
    }
}
