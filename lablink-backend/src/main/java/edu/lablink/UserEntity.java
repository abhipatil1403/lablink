package edu.lablink;
import jakarta.persistence.*; import java.time.Instant; import java.util.UUID;
@Entity @Table(name="users") public class UserEntity {
 @Id private UUID id; @Column(nullable=false) private String name; @Column(nullable=false,unique=true) private String email; @Column(name="password_hash",nullable=false) private String passwordHash; @Column(nullable=false) private String role; @Column(nullable=false) private String status; @Column(name="created_at") private Instant createdAt; @Column(name="updated_at") private Instant updatedAt; @Column(name="last_login_at") private Instant lastLoginAt;
 protected UserEntity(){} public UserEntity(String name,String email,String passwordHash,String role){id=UUID.randomUUID();this.name=name;this.email=email;this.passwordHash=passwordHash;this.role=role;status="ACTIVE";createdAt=updatedAt=Instant.now();}
 public UUID getId(){return id;} public String getName(){return name;} public String getEmail(){return email;} public String getPasswordHash(){return passwordHash;} public String getRole(){return role;} public String getStatus(){return status;} public void login(){lastLoginAt=updatedAt=Instant.now();}
}
