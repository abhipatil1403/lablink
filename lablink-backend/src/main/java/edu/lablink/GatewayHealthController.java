package edu.lablink;

import edu.lablink.Model.Server;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/internal/services") @Transactional
public class GatewayHealthController {
    private final LabStore store;
    private final byte[] key;
    public GatewayHealthController(LabStore store, @Value("${lablink.gateway-key}") String key) {
        this.store = store; this.key = key.getBytes(StandardCharsets.UTF_8);
    }
    record Heartbeat(@NotNull @Size(min = 7, max = 8) Map<String, Integer> endpoints) {}
    @PostMapping("/heartbeat")
    public Map<String, Object> heartbeat(@RequestHeader("X-LabLink-Gateway-Key") String supplied,
                                       @Valid @RequestBody Heartbeat body) {
        if (!MessageDigest.isEqual(key, supplied.getBytes(StandardCharsets.UTF_8)))
            throw new ApiException(HttpStatus.FORBIDDEN, "Gateway credentials required");
        for (Server server : store.all(Server.class, "NetworkServer")) {
            String endpoint = Set.of("monitor", "http").contains(server.service) ? "http" : server.service;
            Integer port = body.endpoints().get(endpoint);
            if (port == null || port < 1 || port > 65535)
                throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid network endpoint");
            server.port = port; server.lastHeartbeat = Instant.now();
        }
        return Map.of("status", "RECORDED");
    }
}
