package edu.lablink;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/auth")
public class AuthController {
    private final UserJpaRepository users;
    private final PasswordEncoder passwords;
    private final JwtService jwt;
    public AuthController(UserJpaRepository users, PasswordEncoder passwords, JwtService jwt) {
        this.users = users; this.passwords = passwords; this.jwt = jwt;
    }
    public record Credentials(@NotBlank @Email @Size(max = 254) String email,
                              @NotBlank @Size(max = 72) String password) {}
    public record Register(@NotBlank @Size(max = 120) String name,
                           @NotBlank @Email @Size(max = 254) String email,
                           @NotBlank @Size(min = 8, max = 72) String password) {}
    @PostMapping("/register") @ResponseStatus(HttpStatus.CREATED) @Transactional
    public Map<String, Object> register(@Valid @RequestBody Register body) {
        String email = body.email().trim().toLowerCase(Locale.ROOT);
        if (users.findByEmailIgnoreCase(email).isPresent())
            throw new ApiException(HttpStatus.CONFLICT, "Email is already registered");
        return result(users.save(new UserEntity(body.name().trim(), email, passwords.encode(body.password()), "STUDENT")));
    }
    @PostMapping("/login") @Transactional
    public Map<String, Object> login(@Valid @RequestBody Credentials body) {
        UserEntity user = users.findByEmailIgnoreCase(body.email().trim())
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        if (!passwords.matches(body.password(), user.getPasswordHash()) || !"ACTIVE".equals(user.getStatus()))
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        user.login();
        users.save(user);
        return result(user);
    }
    @GetMapping("/me") public UserEntity me() { return Access.user(); }
    @PostMapping("/logout") @ResponseStatus(HttpStatus.NO_CONTENT) @Transactional
    public void logout() {
        var user = users.findById(Access.user().getId()).orElseThrow();
        user.invalidateTokens();
    }
    private Map<String, Object> result(UserEntity user) { return Map.of("token", jwt.issue(user), "user", user); }
}
