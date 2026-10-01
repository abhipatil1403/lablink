package edu.lablink;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.*;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
    private final SecretKey key;
    public JwtService(@Value("${JWT_SECRET:}") String secret) {
        if (secret.getBytes(StandardCharsets.UTF_8).length < 32)
            throw new IllegalStateException("Set JWT_SECRET to at least 32 bytes");
        key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }
    public String issue(UserEntity user) {
        return Jwts.builder().subject(user.getId().toString())
            .claim("version", user.getAuthVersion().toString())
            .issuedAt(new java.util.Date()).expiration(java.util.Date.from(Instant.now().plus(Duration.ofHours(8))))
            .signWith(key).compact();
    }
    public Claims claims(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }
}
