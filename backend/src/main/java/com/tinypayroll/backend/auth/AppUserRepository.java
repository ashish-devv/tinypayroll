package com.tinypayroll.backend.auth;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByEmail(String email);

    boolean existsByEmail(String email);

    /** Tenant-scoped lookup — no repository method fetches by bare id for tenant-owned entities (PRD §4). */
    Optional<AppUser> findByIdAndBusinessId(Long id, Long businessId);
}
