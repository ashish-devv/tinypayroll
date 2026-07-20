package com.tinypayroll.backend.catalog;

import com.tinypayroll.backend.audit.Auditable;
import com.tinypayroll.backend.catalog.dto.CreateDepartmentRequest;
import com.tinypayroll.backend.catalog.dto.DepartmentResponse;
import com.tinypayroll.backend.catalog.dto.UpdateDepartmentRequest;
import com.tinypayroll.backend.catalog.mapper.DepartmentMapper;
import com.tinypayroll.backend.common.exceptions.ConflictException;
import com.tinypayroll.backend.common.exceptions.NotFoundException;
import com.tinypayroll.backend.employee.EmployeeRepository;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Write: OWNER/ADMIN. Read: all roles. Tenant-scoped on every query (PRD §4). */
@Service
public class DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final EmployeeRepository employeeRepository;
    private final DepartmentMapper departmentMapper;

    public DepartmentService(DepartmentRepository departmentRepository,
                             EmployeeRepository employeeRepository,
                             DepartmentMapper departmentMapper) {
        this.departmentRepository = departmentRepository;
        this.employeeRepository = employeeRepository;
        this.departmentMapper = departmentMapper;
    }

    @Transactional(readOnly = true)
    public List<DepartmentResponse> list(Long businessId) {
        return departmentRepository.findByBusinessIdOrderByNameAsc(businessId)
                .stream().map(departmentMapper::toResponse).toList();
    }

    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    @Auditable(action = "CREATE_DEPARTMENT", entityType = "Department")
    @Transactional
    public DepartmentResponse create(Long businessId, CreateDepartmentRequest request) {
        String name = request.name().trim();
        if (departmentRepository.existsByBusinessIdAndNameIgnoreCase(businessId, name)) {
            throw new ConflictException("A department named \"" + name + "\" already exists");
        }
        Department department = Department.builder().businessId(businessId).name(name).build();
        return departmentMapper.toResponse(departmentRepository.save(department));
    }

    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    @Auditable(action = "UPDATE_DEPARTMENT", entityType = "Department")
    @Transactional
    public DepartmentResponse update(Long id, Long businessId, UpdateDepartmentRequest request) {
        Department department = findOrThrow(id, businessId);
        String name = request.name().trim();
        if (!department.getName().equalsIgnoreCase(name)
                && departmentRepository.existsByBusinessIdAndNameIgnoreCase(businessId, name)) {
            throw new ConflictException("A department named \"" + name + "\" already exists");
        }
        department.setName(name);
        return departmentMapper.toResponse(departmentRepository.save(department));
    }

    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    @Auditable(action = "DELETE_DEPARTMENT", entityType = "Department")
    @Transactional
    public void delete(Long id, Long businessId) {
        Department department = findOrThrow(id, businessId);
        if (employeeRepository.existsByBusinessIdAndDepartmentIgnoreCase(businessId, department.getName())) {
            throw new ConflictException("Can't delete a department still assigned to employees");
        }
        departmentRepository.delete(department);
    }

    private Department findOrThrow(Long id, Long businessId) {
        return departmentRepository.findByIdAndBusinessId(id, businessId)
                .orElseThrow(() -> NotFoundException.of("Department", id));
    }
}
