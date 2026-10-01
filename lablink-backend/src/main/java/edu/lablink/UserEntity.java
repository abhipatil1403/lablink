package edu.lablink;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
public class UserEntity {
    @Id private UUID id;
    @Column(nullable = false, length = 120) private String name;
    @Column(nullable = false, unique = true, length = 254) private String email;
    @JsonIgnore @Column(name = "password_hash", nullable = false, length = 100) private String passwordHash;
    @Column(nullable = false, length = 20) private String role;
    @Column(nullable = false, length = 20) private String status;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant lastLoginAt;
    @JsonIgnore private Instant tokensValidAfter;
    @JsonIgnore private UUID authVersion = UUID.randomUUID();
    protected UserEntity() {}
    public UserEntity(String name, String email, String passwordHash, String role) {
        id = UUID.randomUUID();
        this.name = name;
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
        status = "ACTIVE";
        createdAt = updatedAt = Instant.now();
    }
    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public String getRole() { return role; }
    public String getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Instant getLastLoginAt() { return lastLoginAt; }
    public Instant getTokensValidAfter() { return tokensValidAfter; }
    public UUID getAuthVersion() { return authVersion; }
    public void login() { lastLoginAt = updatedAt = Instant.now(); }
    public void invalidateTokens() { tokensValidAfter = Instant.now(); authVersion = UUID.randomUUID(); }
    public void setStatus(String value) { status = value; updatedAt = Instant.now(); invalidateTokens(); }
}
