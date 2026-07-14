package com.tinypayroll.backend.auth;

import com.tinypayroll.backend.auth.dto.ForgotPasswordRequest;
import com.tinypayroll.backend.auth.dto.LoginRequest;
import com.tinypayroll.backend.auth.dto.RefreshRequest;
import com.tinypayroll.backend.auth.dto.ResetPasswordRequest;
import com.tinypayroll.backend.auth.dto.SignupRequest;
import com.tinypayroll.backend.auth.dto.TokenResponse;
import com.tinypayroll.backend.business.Business;
import com.tinypayroll.backend.business.BusinessRepository;
import com.tinypayroll.backend.common.exceptions.ConflictException;
import com.tinypayroll.backend.common.exceptions.LockedAccountException;
import com.tinypayroll.backend.security.JwtProperties;
import com.tinypayroll.backend.security.JwtService;
import com.tinypayroll.backend.security.RefreshTokenGenerator;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Signup, login, refresh, logout, forgot/reset-password (PRD §5, §6, §8). Brute-force lockout:
 * 5 failed attempts locks the account for 15 minutes.
 */
@Slf4j
@Service
public class AuthService {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final long LOCKOUT_MINUTES = 15;
    private static final long RESET_TOKEN_TTL_MINUTES = 30;

    private final AppUserRepository appUserRepository;
    private final BusinessRepository businessRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final JwtProperties jwtProperties;
    private final RefreshTokenGenerator refreshTokenGenerator;

    public AuthService(
            AppUserRepository appUserRepository,
            BusinessRepository businessRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            JwtProperties jwtProperties,
            RefreshTokenGenerator refreshTokenGenerator) {
        this.appUserRepository = appUserRepository;
        this.businessRepository = businessRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.jwtProperties = jwtProperties;
        this.refreshTokenGenerator = refreshTokenGenerator;
    }

    @Transactional
    public TokenResponse signup(SignupRequest request) {
        if (appUserRepository.existsByEmail(request.email())) {
            throw new ConflictException("An account with this email already exists");
        }

        Business business = Business.builder()
                .companyName(request.companyName())
                .email(request.email())
                .build();
        business = businessRepository.save(business);

        AppUser owner = AppUser.builder()
                .business(business)
                .name(request.ownerName())
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .authProvider(AuthProvider.LOCAL)
                .role(Role.OWNER)
                .enabled(true)
                .emailVerified(false)
                .build();
        owner = appUserRepository.save(owner);

        return issueTokens(owner, null);
    }

    @Transactional
    public TokenResponse login(LoginRequest request, String deviceInfo) {
        AppUser user = appUserRepository
                .findByEmail(request.email())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (user.isLocked()) {
            throw new LockedAccountException(
                    "Account locked due to too many failed attempts. Try again after "
                            + user.getLockedUntil());
        }

        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            registerFailedAttempt(user);
            throw new BadCredentialsException("Invalid email or password");
        }

        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        user.setLastLoginAt(Instant.now());
        appUserRepository.save(user);

        return issueTokens(user, deviceInfo);
    }

    @Transactional
    public TokenResponse refresh(RefreshRequest request) {
        String hash = refreshTokenGenerator.hash(request.refreshToken());
        RefreshToken stored = refreshTokenRepository
                .findByTokenHash(hash)
                .orElseThrow(() -> new BadCredentialsException("Invalid refresh token"));

        if (!stored.isValid()) {
            throw new BadCredentialsException("Refresh token expired or revoked");
        }

        // Rotate: revoke the used token, issue a fresh pair.
        stored.setRevoked(true);
        refreshTokenRepository.save(stored);

        return issueTokens(stored.getUser(), stored.getDeviceInfo());
    }

    @Transactional
    public void logout(RefreshRequest request) {
        String hash = refreshTokenGenerator.hash(request.refreshToken());
        refreshTokenRepository.findByTokenHash(hash).ifPresent(token -> {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
        });
    }

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        appUserRepository.findByEmail(request.email()).ifPresent(user -> {
            String rawToken = refreshTokenGenerator.generateRawToken();
            PasswordResetToken resetToken = PasswordResetToken.builder()
                    .user(user)
                    .tokenHash(refreshTokenGenerator.hash(rawToken))
                    .expiresAt(Instant.now().plus(RESET_TOKEN_TTL_MINUTES, ChronoUnit.MINUTES))
                    .build();
            passwordResetTokenRepository.save(resetToken);
            // PRD §12 open question #2: no email infra decided for MVP yet — log so the flow
            // is exercisable end-to-end. Replace with real delivery once that's chosen.
            log.info("Password reset requested for {} — token (send via email, not logged in prod): {}",
                    user.getEmail(), rawToken);
        });
        // Always return success regardless of whether the email exists — don't leak account existence.
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        String hash = refreshTokenGenerator.hash(request.token());
        PasswordResetToken resetToken = passwordResetTokenRepository
                .findByTokenHash(hash)
                .filter(PasswordResetToken::isValid)
                .orElseThrow(() -> new BadCredentialsException("Invalid or expired reset token"));

        AppUser user = resetToken.getUser();
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        appUserRepository.save(user);

        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);

        // Password change invalidates all existing sessions.
        refreshTokenRepository.revokeAllForUser(user.getId());
    }

    private void registerFailedAttempt(AppUser user) {
        int attempts = user.getFailedLoginAttempts() + 1;
        user.setFailedLoginAttempts(attempts);
        if (attempts >= MAX_FAILED_ATTEMPTS) {
            user.setLockedUntil(Instant.now().plus(LOCKOUT_MINUTES, ChronoUnit.MINUTES));
        }
        appUserRepository.save(user);
    }

    private TokenResponse issueTokens(AppUser user, String deviceInfo) {
        String accessToken = jwtService.generateAccessToken(user);

        String rawRefreshToken = refreshTokenGenerator.generateRawToken();
        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .tokenHash(refreshTokenGenerator.hash(rawRefreshToken))
                .expiresAt(Instant.now().plus(jwtProperties.refreshTokenTtlDays(), ChronoUnit.DAYS))
                .deviceInfo(deviceInfo)
                .build();
        refreshTokenRepository.save(refreshToken);

        return new TokenResponse(
                accessToken,
                rawRefreshToken,
                jwtService.accessTokenTtlSeconds(),
                user.getId(),
                user.getBusiness().getId(),
                user.getName(),
                user.getEmail(),
                user.getRole().name());
    }
}
