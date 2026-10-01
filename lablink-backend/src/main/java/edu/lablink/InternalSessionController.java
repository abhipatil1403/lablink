package edu.lablink;

import edu.lablink.Model.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/internal/sessions") @Transactional
public class InternalSessionController {
    private final LabStore store;
    private final byte[] key;
    public InternalSessionController(LabStore store, @Value("${lablink.gateway-key}") String key) {
        if (key.length() < 32) throw new IllegalStateException("GATEWAY_SHARED_SECRET must have at least 32 characters");
        this.store = store; this.key = key.getBytes(StandardCharsets.UTF_8);
    }
    private Attempt validate(UUID id, String supplied) {
        if (supplied == null || !MessageDigest.isEqual(key, supplied.getBytes(StandardCharsets.UTF_8)))
            throw new ApiException(HttpStatus.FORBIDDEN, "Gateway credentials required");
        var attempt = store.get(Attempt.class, id); Access.owner(attempt.student);
        if (attempt.startedAt.isBefore(Instant.now().minus(Duration.ofHours(2))) || "SUBMITTED".equals(attempt.status))
            throw new ApiException(HttpStatus.CONFLICT, "This attempt has expired or was submitted");
        return attempt;
    }
    @GetMapping("/{id}/validate")
    public Map<String, Object> configuration(@PathVariable UUID id, @RequestHeader("X-LabLink-Gateway-Key") String key) {
        var attempt = validate(id, key);
        var dto = store.attempt(attempt);
        dto.put("evaluationTests", store.tests(attempt.assignment).stream().filter(t -> t.enabled)
            .map(t -> Map.of("id", t.id, "type", t.type, "weight", t.weight, "configuration", t.configuration)).toList());
        return dto;
    }
    record Begin(@NotBlank @Size(max = 32768) String solution) {}
    @PostMapping("/{id}/begin")
    public Map<String, Object> begin(@PathVariable UUID id, @RequestHeader("X-LabLink-Gateway-Key") String key,
                                   @Valid @RequestBody Begin body) {
        validate(id, key);
        return Map.of("status", "RUNNING", "evaluationTests", store.begin(id, body.solution()));
    }
    record Complete(@NotNull @Pattern(regexp = "run|test") String mode, @NotNull @Size(max = 65536) String output,
                    @NotNull @Size(max = 131072) String networkLog, @NotNull @Size(max = 50) List<LabStore.Report> results) {}
    @PostMapping("/{id}/complete")
    public Map<String, Object> complete(@PathVariable UUID id, @RequestHeader("X-LabLink-Gateway-Key") String key,
                                       @Valid @RequestBody Complete body) {
        validate(id, key); store.complete(id, body.mode(), body.output(), body.networkLog(), body.results());
        return store.attempt(store.get(Attempt.class, id));
    }
    record Failure(@NotBlank @Size(max = 2000) String message) {}
    @PostMapping("/{id}/failure")
    public Map<String, Object> failure(@PathVariable UUID id, @RequestHeader("X-LabLink-Gateway-Key") String key,
                                      @Valid @RequestBody Failure body) {
        validate(id, key); store.failure(id, body.message()); return Map.of("status", "FAILED");
    }
}
