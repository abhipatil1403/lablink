package edu.lablink;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.time.Instant;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwt;
    private final UserJpaRepository users;
    public JwtAuthenticationFilter(JwtService jwt, UserJpaRepository users) { this.jwt = jwt; this.users = users; }
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            try {
                var claims = jwt.claims(header.substring(7));
                users.findById(java.util.UUID.fromString(claims.getSubject())).filter(u -> "ACTIVE".equals(u.getStatus()))
                    .filter(u -> u.getAuthVersion().toString().equals(claims.get("version", String.class)))
                    .ifPresent(u -> SecurityContextHolder.getContext().setAuthentication(
                        new UsernamePasswordAuthenticationToken(u, null,
                            java.util.List.of(new SimpleGrantedAuthority("ROLE_" + u.getRole())))));
            } catch (JwtException | IllegalArgumentException ignored) {
                SecurityContextHolder.clearContext();
            }
        }
        chain.doFilter(request, response);
    }
}
