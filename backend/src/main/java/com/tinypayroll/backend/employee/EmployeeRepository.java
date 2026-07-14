package com.tinypayroll.backend.employee;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    Page<Employee> findByBusinessId(Long businessId, Pageable pageable);

    List<Employee> findByBusinessId(Long businessId);

    Page<Employee> findByBusinessIdAndStatus(Long businessId, EmployeeStatus status, Pageable pageable);

    Optional<Employee> findByIdAndBusinessId(Long id, Long businessId);

    List<Employee> findByBusinessIdAndStatus(Long businessId, EmployeeStatus status);

    List<Employee> findByIdInAndBusinessId(List<Long> ids, Long businessId);
}
