package com.tinypayroll.backend.security;

import com.tinypayroll.backend.auth.AppUser;
import java.util.Collection;
import java.util.List;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * Spring Security's view of an authenticated caller. Wraps the fields we need from the JWT
 * claims (populated by {@link JwtAuthFilter}) rather than re-fetching the entity per request.
 */
@Getter
public class UserPrincipal implements UserDetails {

    private final Long userId;
    private final Long businessId;
    private final String email;
    private final String role;

    public UserPrincipal(Long userId, Long businessId, String email, String role) {
        this.userId = userId;
        this.businessId = businessId;
        this.email = email;
        this.role = role;
    }

    public static UserPrincipal fromUser(AppUser user) {
        return new UserPrincipal(user.getId(), user.getBusiness().getId(), user.getEmail(), user.getRole().name());
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role));
    }

    @Override
    public String getPassword() {
        return null;
    }

    @Override
    public String getUsername() {
        return email;
    }
}
