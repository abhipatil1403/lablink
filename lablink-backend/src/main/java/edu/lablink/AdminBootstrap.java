package edu.lablink;

import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.*;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AdminBootstrap {
    @Bean ApplicationRunner initialAdmin(UserJpaRepository users, PasswordEncoder passwords,
            @Value("${INITIAL_ADMIN_EMAIL:}") String email, @Value("${INITIAL_ADMIN_PASSWORD:}") String password) {
        return args -> {
            if (users.existsByRole("ADMIN") || (email.isBlank() && password.isBlank())) return;
            if (!email.matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+") || password.length() < 12 || password.length() > 72)
                throw new IllegalStateException("Initial admin requires a valid email and a password of 12–72 characters");
            users.save(new UserEntity("Administrator", email.trim().toLowerCase(Locale.ROOT), passwords.encode(password), "ADMIN"));
        };
    }
}
