package edu.lablink;

import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.*;
import org.springframework.core.Ordered;
import org.springframework.web.cors.*;
import org.springframework.web.filter.CorsFilter;

@Configuration
public class WebConfiguration {
    @Bean FilterRegistrationBean<CorsFilter> corsFilter(
            @Value("${lablink.frontend-origin}") String origins) {
        var config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.stream(origins.split(",")).map(String::trim).filter(s -> !s.isBlank()).toList());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-LabLink-Gateway-Key"));
        config.setMaxAge(3600L);
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        var registration = new FilterRegistrationBean<>(new CorsFilter(source));
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        return registration;
    }
}
