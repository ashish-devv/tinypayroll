package com.tinypayroll.backend.employee;

import com.tinypayroll.backend.audit.Auditable;
import com.tinypayroll.backend.common.exceptions.NotFoundException;
import com.tinypayroll.backend.employee.dto.CreateEmployeeRequest;
import com.tinypayroll.backend.employee.dto.EmployeeResponse;
import com.tinypayroll.backend.employee.dto.UpdateEmployeeRequest;
import com.tinypayroll.backend.employee.mapper.EmployeeMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Write: OWNER/ADMIN. Read: all roles (PRD §8). Tenant scoping enforced on every query (PRD §4). */
@Service
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final EmployeeMapper employeeMapper;

    public EmployeeService(EmployeeRepository employeeRepository, EmployeeMapper employeeMapper) {
        this.employeeRepository = employeeRepository;
        this.employeeMapper = employeeMapper;
    }

    @Transactional(readOnly = true)
    public Page<EmployeeResponse> list(Long businessId, EmployeeStatus status, Pageable pageable) {
        Page<Employee> page = status == null
                ? employeeRepository.findByBusinessId(businessId, pageable)
                : employeeRepository.findByBusinessIdAndStatus(businessId, status, pageable);
        return page.map(employeeMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public EmployeeResponse get(Long id, Long businessId) {
        return employeeMapper.toResponse(findOrThrow(id, businessId));
    }

    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    @Auditable(action = "CREATE_EMPLOYEE", entityType = "Employee")
    @Transactional
    public EmployeeResponse create(Long businessId, CreateEmployeeRequest request) {
        Employee employee = employeeMapper.fromCreateRequest(request);
        employee.setBusinessId(businessId);
        employee.setStatus(EmployeeStatus.ACTIVE);
        return employeeMapper.toResponse(employeeRepository.save(employee));
    }

    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    @Auditable(action = "UPDATE_EMPLOYEE", entityType = "Employee")
    @Transactional
    public EmployeeResponse update(Long id, Long businessId, UpdateEmployeeRequest request) {
        Employee employee = findOrThrow(id, businessId);
        employeeMapper.updateEntity(request, employee);
        return employeeMapper.toResponse(employeeRepository.save(employee));
    }

    /** Soft delete — status flips to INACTIVE, row is retained for payroll/attendance history. */
    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    @Auditable(action = "DELETE_EMPLOYEE", entityType = "Employee")
    @Transactional
    public void softDelete(Long id, Long businessId) {
        Employee employee = findOrThrow(id, businessId);
        employee.setStatus(EmployeeStatus.INACTIVE);
        employeeRepository.save(employee);
    }

    private Employee findOrThrow(Long id, Long businessId) {
        return employeeRepository
                .findByIdAndBusinessId(id, businessId)
                .orElseThrow(() -> NotFoundException.of("Employee", id));
    }
}
