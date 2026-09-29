package edu.lablink;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class AuthenticationFilter extends OncePerRequestFilter {
    private final FirebaseAuth auth;
    private final Firestore firestore;
    private final ObjectMapper json;

    public AuthenticationFilter(FirebaseAuth auth, Firestore firestore, ObjectMapper json) {
        this.auth = auth;
        this.firestore = firestore;
        this.json = json;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        if (!path.startsWith("/api/") || path.equals("/api/health") || request.getMethod().equals("OPTIONS")) {
            chain.doFilter(request, response);
            return;
        }

        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ") || header.substring(7).isBlank()) {
            fail(response, HttpStatus.UNAUTHORIZED, "Authentication required");
            return;
        }
        FirebaseToken token;
        DocumentSnapshot profile;
        try {
            token = auth.verifyIdToken(header.substring(7));
            profile = firestore.collection("users").document(token.getUid()).get().get(5, TimeUnit.SECONDS);
            if (!profile.exists() && !path.equals("/api/users/register")) {
                fail(response, HttpStatus.FORBIDDEN, "User profile not found");
                return;
            }
            if (profile.exists() && !"ACTIVE".equals(profile.getString("status"))) {
                fail(response, HttpStatus.FORBIDDEN, "Account disabled");
                return;
            }
        } catch (FirebaseAuthException error) {
            fail(response, HttpStatus.UNAUTHORIZED, "Invalid or expired credentials");
            return;
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            fail(response, HttpStatus.SERVICE_UNAVAILABLE, "Unable to connect to LabLink services");
            return;
        } catch (Exception error) {
            fail(response, HttpStatus.SERVICE_UNAVAILABLE, "Unable to connect to LabLink services");
            return;
        }
        request.setAttribute("firebaseToken", token);
        request.setAttribute("profile", profile);
        chain.doFilter(request, response);
    }

    private void fail(HttpServletResponse response, HttpStatus status, String message) throws IOException {
        response.setStatus(status.value());
        response.setContentType("application/json");
        json.writeValue(response.getWriter(), Map.of("success", false, "message", message, "status", status.value()));
    }
}
