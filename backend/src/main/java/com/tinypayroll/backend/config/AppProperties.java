package com.tinypayroll.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Grouped app-level config properties (PRD §7). */
@ConfigurationProperties(prefix = "app")
public record AppProperties(String name) {
}
