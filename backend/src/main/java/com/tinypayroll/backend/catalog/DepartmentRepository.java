package com.tinypayroll.backend.catalog;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DepartmentRepository extends JpaRepository<Department, Long> {

    List<Department> findByBusinessIdOrderByNameAsc(Long businessId);

    Optional<Department> findByIdAndBusinessId(Long id, Long businessId);

    boolean existsByBusinessIdAndNameIgnoreCase(Long businessId, String name);
}
