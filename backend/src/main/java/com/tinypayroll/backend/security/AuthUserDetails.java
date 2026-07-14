package com.tinypayroll.backend.security;

import com.tinypayroll.backend.auth.AppUser;
import java.util.Collection;
import java.util.List;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * {@link UserDetails} view of an {@link AppUser} for the standard Spring Security
 * authentication flow. Account-state flags (locked/enabled) map directly onto AppUser's
 * lockout fields (PRD §6) so brute-force lockout composes with Spring Security idiomatically.
 */
@Getter
public class AuthUserDetails implements UserDetails {

    private final Long userId;
    private final Long businessId;
    private final String email;
    private final String passwordHash;
    private final String role;
    private final boolean enabled;
    private final boolean accountNonLocked;

    public AuthUserDetails(AppUser user) {
        this.userId = user.getId();
        this.businessId = user.getBusiness().getId();
        this.email = user.getEmail();
        this.passwordHash = user.getPasswordHash();
        this.role = user.getRole().name();
        this.enabled = user.isEnabled();
        this.accountNonLocked = !user.isLocked();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonLocked() {
        return accountNonLocked;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
