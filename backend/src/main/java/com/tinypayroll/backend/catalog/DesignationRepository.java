package com.tinypayroll.backend.catalog;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DesignationRepository extends JpaRepository<Designation, Long> {

    List<Designation> findByBusinessIdOrderByNameAsc(Long businessId);

    Optional<Designation> findByIdAndBusinessId(Long id, Long businessId);

    boolean existsByBusinessIdAndNameIgnoreCase(Long businessId, String name);
}
