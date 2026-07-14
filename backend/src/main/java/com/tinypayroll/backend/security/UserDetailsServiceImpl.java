package com.tinypayroll.backend.security;

import com.tinypayroll.backend.auth.AppUser;
import com.tinypayroll.backend.auth.AppUserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * Used only by {@code AuthenticationManager} during the login flow to verify credentials —
 * every other authenticated request is verified statelessly from the JWT by
 * {@link JwtAuthFilter} without touching the DB.
 */
@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private final AppUserRepository appUserRepository;

    public UserDetailsServiceImpl(AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        AppUser user = appUserRepository
                .findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("No account with email: " + email));
        return new AuthUserDetails(user);
    }
}
