package com.tinypayroll.backend.catalog;

import com.tinypayroll.backend.audit.Auditable;
import com.tinypayroll.backend.catalog.dto.CreateDesignationRequest;
import com.tinypayroll.backend.catalog.dto.DesignationResponse;
import com.tinypayroll.backend.catalog.dto.UpdateDesignationRequest;
import com.tinypayroll.backend.catalog.mapper.DesignationMapper;
import com.tinypayroll.backend.common.exceptions.ConflictException;
import com.tinypayroll.backend.common.exceptions.NotFoundException;
import com.tinypayroll.backend.employee.EmployeeRepository;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Write: OWNER/ADMIN. Read: all roles. Tenant-scoped on every query (PRD §4). */
@Service
public class DesignationService {

    private final DesignationRepository designationRepository;
    private final DepartmentRepository departmentRepository;
    private final EmployeeRepository employeeRepository;
    private final DesignationMapper designationMapper;

    public DesignationService(DesignationRepository designationRepository,
                              DepartmentRepository departmentRepository,
                              EmployeeRepository employeeRepository,
                              DesignationMapper designationMapper) {
        this.designationRepository = designationRepository;
        this.departmentRepository = departmentRepository;
        this.employeeRepository = employeeRepository;
        this.designationMapper = designationMapper;
    }

    /** Reject a departmentId that doesn't belong to this tenant. Null is allowed (unassigned). */
    private void validateDepartment(Long departmentId, Long businessId) {
        if (departmentId != null && departmentRepository.findByIdAndBusinessId(departmentId, businessId).isEmpty()) {
            throw NotFoundException.of("Department", departmentId);
        }
    }

    @Transactional(readOnly = true)
    public List<DesignationResponse> list(Long businessId) {
        return designationRepository.findByBusinessIdOrderByNameAsc(businessId)
                .stream().map(designationMapper::toResponse).toList();
    }

    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    @Auditable(action = "CREATE_DESIGNATION", entityType = "Designation")
    @Transactional
    public DesignationResponse create(Long businessId, CreateDesignationRequest request) {
        String name = request.name().trim();
        if (designationRepository.existsByBusinessIdAndNameIgnoreCase(businessId, name)) {
            throw new ConflictException("A designation named \"" + name + "\" already exists");
        }
        validateDepartment(request.departmentId(), businessId);
        Designation designation = Designation.builder()
                .businessId(businessId)
                .departmentId(request.departmentId())
                .name(name)
                .defaultSalary(request.defaultSalary())
                .defaultSalaryType(request.defaultSalaryType())
                .build();
        return designationMapper.toResponse(designationRepository.save(designation));
    }

    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    @Auditable(action = "UPDATE_DESIGNATION", entityType = "Designation")
    @Transactional
    public DesignationResponse update(Long id, Long businessId, UpdateDesignationRequest request) {
        Designation designation = findOrThrow(id, businessId);
        String name = request.name().trim();
        if (!designation.getName().equalsIgnoreCase(name)
                && designationRepository.existsByBusinessIdAndNameIgnoreCase(businessId, name)) {
            throw new ConflictException("A designation named \"" + name + "\" already exists");
        }
        validateDepartment(request.departmentId(), businessId);
        designation.setName(name);
        designation.setDepartmentId(request.departmentId());
        designation.setDefaultSalary(request.defaultSalary());
        designation.setDefaultSalaryType(request.defaultSalaryType());
        return designationMapper.toResponse(designationRepository.save(designation));
    }

    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    @Auditable(action = "DELETE_DESIGNATION", entityType = "Designation")
    @Transactional
    public void delete(Long id, Long businessId) {
        Designation designation = findOrThrow(id, businessId);
        if (employeeRepository.existsByBusinessIdAndRoleIgnoreCase(businessId, designation.getName())) {
            throw new ConflictException("Can't delete a designation still assigned to employees");
        }
        designationRepository.delete(designation);
    }

    private Designation findOrThrow(Long id, Long businessId) {
        return designationRepository.findByIdAndBusinessId(id, businessId)
                .orElseThrow(() -> NotFoundException.of("Designation", id));
    }
}
