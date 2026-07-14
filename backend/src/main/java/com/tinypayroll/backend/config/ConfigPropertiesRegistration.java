package com.tinypayroll.backend.config;

import com.tinypayroll.backend.employee.EncryptionProperties;
import com.tinypayroll.backend.security.JwtProperties;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.context.annotation.Configuration;

/**
 * Enables component-scanning for all {@code @ConfigurationProperties} record classes across
 * packages (JwtProperties in {@code security}, EncryptionProperties in {@code employee}, the
 * rest in {@code config}) so they don't need individual
 * {@code @EnableConfigurationProperties} registration.
 */
@Configuration
@ConfigurationPropertiesScan(basePackageClasses = {AppProperties.class, JwtProperties.class, EncryptionProperties.class})
public class ConfigPropertiesRegistration {
}
