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
 * Rotating refresh token (PRD §5, §6). Stored hashed (SHA-256 of the raw token) so a DB leak
 * doesn't hand out live sessions — revocable individually (logout) or in bulk
 * (logout-all-devices, password change).
 */
@Getter
@Setter
@Entity
@Table(name = "refresh_token", indexes = {@Index(name = "idx_refresh_token_hash", columnList = "tokenHash")})
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = false)
@ToString(exclude = "tokenHash")
public class RefreshToken extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Column(nullable = false, unique = true, length = 128)
    private String tokenHash;

    @Column(nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    @Builder.Default
    private boolean revoked = false;

    private String deviceInfo;

    public boolean isValid() {
        return !revoked && expiresAt.isAfter(Instant.now());
    }
}
