package com.tinypayroll.backend.auth;

import com.tinypayroll.backend.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * Short-lived, single-use token for the forgot/reset-password flow (PRD §8). Stored hashed,
 * same rationale as {@link RefreshToken}. Email delivery of the raw token is out of scope for
 * MVP (PRD §12 open question #2 — no email infra decided yet); {@code AuthService} currently
 * logs the raw token so the flow is testable end-to-end before that infra exists.
 */
@Getter
@Setter
@Entity
@Table(name = "password_reset_token", indexes = {@Index(name = "idx_reset_token_hash", columnList = "tokenHash")})
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = false)
@ToString(exclude = "tokenHash")
public class PasswordResetToken extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Column(nullable = false, unique = true, length = 128)
    private String tokenHash;

    @Column(nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    @Builder.Default
    private boolean used = false;

    public boolean isValid() {
        return !used && expiresAt.isAfter(Instant.now());
    }
}
