package edu.lablink;

import com.google.cloud.firestore.FieldValue;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/internal/sessions")
public class InternalSessionController {
    private final SessionController sessions;
    private final FirestoreRepository repository;
    private final String gatewayKey;

    public InternalSessionController(SessionController sessions, FirestoreRepository repository,
            @Value("${lablink.gateway-key}") String gatewayKey) {
        this.sessions = sessions;
        this.repository = repository;
        this.gatewayKey = gatewayKey;
    }

    record StateRequest(@NotBlank String status) {}
    record LogRequest(@NotBlank String direction, @NotBlank @Size(max = 1200) String text) {}

    @GetMapping("/{id}/validate")
    public Map<String, Object> validate(@PathVariable String id,
            @RequestHeader(value = "X-LabLink-Gateway-Key", required = false) String key, HttpServletRequest request) {
        authenticate(key);
        Access.requireRole(request, "STUDENT");
        Map<String, Object> session = sessions.requireSession(id);
        Access.requireOwner(request, (String) session.get("studentId"));
        try {
            if (Instant.parse((String) session.get("startTime")).isBefore(Instant.now().minus(Duration.ofHours(2)))) {
                throw new ApiException(HttpStatus.CONFLICT, "Session has expired");
            }
        } catch (NullPointerException | java.time.format.DateTimeParseException error) {
            throw new ApiException(HttpStatus.CONFLICT, "Session timestamp is invalid");
        }
        if (!List.of("STARTING", "RUNNING", "STOPPED", "FAILED").contains(session.get("status"))
                || !"tcp-chat".equals(session.getOrDefault("assignmentType", session.get("experimentType")))) {
            throw new ApiException(HttpStatus.CONFLICT, "Session is not available for TCP connection");
        }
        return Map.of("id", id, "experimentId", session.get("experimentId"), "status", session.get("status"));
    }

    @PostMapping("/{id}/state")
    public Map<String, Object> state(@PathVariable String id, @Valid @RequestBody StateRequest input,
            @RequestHeader(value = "X-LabLink-Gateway-Key", required = false) String key, HttpServletRequest request) {
        Map<String, Object> session = validate(id, key, request);
        String next = input.status();
        if (!List.of("RUNNING", "STOPPED", "FAILED").contains(next)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid session status");
        }
        if (next.equals("STOPPED") && session.get("status").equals("STOPPED")) return session;
        if (next.equals("FAILED") && session.get("status").equals("STOPPED")) {
            throw new ApiException(HttpStatus.CONFLICT, "Stopped session cannot fail");
        }
        Map<String, Object> fields = new HashMap<>();
        fields.put("status", next);
        fields.put("endTime", next.equals("RUNNING") ? null : Instant.now().toString());
        repository.update("sessions", id, fields);
        return Map.of("id", id, "status", next);
    }

    @PostMapping("/{id}/log")
    public Map<String, Object> log(@PathVariable String id, @Valid @RequestBody LogRequest input,
            @RequestHeader(value = "X-LabLink-Gateway-Key", required = false) String key, HttpServletRequest request) {
        validate(id, key, request);
        if (!List.of("STUDENT", "SERVER").contains(input.direction())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid transcript direction");
        }
        Map<String, Object> session = sessions.requireSession(id);
        if (session.get("logs") instanceof List<?> logs && logs.size() >= 200) {
            throw new ApiException(HttpStatus.CONFLICT, "Session transcript limit reached");
        }
        Map<String, Object> line = Map.of("direction", input.direction(), "text", input.text(),
                "at", Instant.now().toString(), "id", UUID.randomUUID().toString());
        repository.update("sessions", id, Map.of("logs", FieldValue.arrayUnion(line)));
        return line;
    }

    private void authenticate(String supplied) {
        if (gatewayKey.isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Network gateway is not configured");
        }
        if (supplied == null || !MessageDigest.isEqual(gatewayKey.getBytes(StandardCharsets.UTF_8),
                supplied.getBytes(StandardCharsets.UTF_8))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Network gateway access denied");
        }
    }
}
