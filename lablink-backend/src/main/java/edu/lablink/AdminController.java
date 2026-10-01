package edu.lablink;

import edu.lablink.Model.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.net.URI;
import java.net.http.*;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/admin") @Transactional
public class AdminController {
    private final LabStore store;
    private final UserJpaRepository users;
    private final PasswordEncoder passwords;
    private final String networkUrl;
    public AdminController(LabStore store, UserJpaRepository users, PasswordEncoder passwords,
                           @Value("${lablink.network-url}") String networkUrl) {
        this.store = store; this.users = users; this.passwords = passwords; this.networkUrl = networkUrl;
    }
    @GetMapping("/users") public List<UserEntity> users(@RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "") String role, @RequestParam(defaultValue = "") String status) {
        String query = search.toLowerCase(Locale.ROOT);
        return users.findAll().stream().filter(u -> role.isBlank() || u.getRole().equals(role))
            .filter(u -> status.isBlank() || u.getStatus().equals(status))
            .filter(u -> (u.getName() + " " + u.getEmail()).toLowerCase(Locale.ROOT).contains(query)).toList();
    }
    @PostMapping("/faculty") @ResponseStatus(HttpStatus.CREATED)
    public UserEntity faculty(@Valid @RequestBody AuthController.Register body) {
        String email = body.email().trim().toLowerCase(Locale.ROOT);
        if (users.findByEmailIgnoreCase(email).isPresent()) throw new ApiException(HttpStatus.CONFLICT, "Email is already registered");
        var faculty = users.save(new UserEntity(body.name().trim(), email, passwords.encode(body.password()), "FACULTY"));
        store.audit("CREATE_FACULTY", faculty.getId(), email); return faculty;
    }
    record Status(@NotNull @Pattern(regexp = "ACTIVE|INACTIVE|SUSPENDED") String status) {}
    @PatchMapping("/users/{id}/status") public UserEntity status(@PathVariable UUID id, @Valid @RequestBody Status body) {
        if (id.equals(Access.user().getId())) throw new ApiException(HttpStatus.CONFLICT, "You cannot deactivate your own account");
        var u = users.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        if ("ADMIN".equals(u.getRole())) throw new ApiException(HttpStatus.CONFLICT, "Administrator status is protected");
        u.setStatus(body.status()); store.audit("USER_STATUS", id, body.status()); return u;
    }
    @GetMapping({"/assignments", "/experiments"}) public List<Map<String, Object>> assignments() {
        return store.all(Assignment.class, "Assignment").stream().map(store::assignment).toList();
    }
    @GetMapping("/servers") public List<Map<String, Object>> servers() {
        return store.all(Server.class, "NetworkServer").stream().map(s -> {
            var d = new LinkedHashMap<String, Object>();
            d.put("id", s.id); d.put("name", s.name); d.put("service", s.service); d.put("address", s.address);
            d.put("port", s.port); d.put("supportedProtocols", List.of(s.protocol)); d.put("status", s.status);
            d.put("lastHeartbeat", s.lastHeartbeat); return (Map<String, Object>) d;
        }).toList();
    }
    @PatchMapping("/servers/{id}/status") public Map<String, Object> serverStatus(@PathVariable UUID id, @Valid @RequestBody Status body) {
        var s = store.get(Server.class, id); s.status = body.status(); store.audit("SERVER_STATUS", id, body.status());
        return Map.of("id", id, "status", s.status);
    }
    @GetMapping("/audit") public List<Audit> audit() {
        return store.all(Audit.class, "AuditLog").stream().sorted(Comparator.comparing((Audit a) -> a.createdAt).reversed()).limit(200).toList();
    }
    @GetMapping("/dashboard") public Map<String, Object> dashboard() {
        var people = users.findAll(); var assignments = store.all(Assignment.class, "Assignment");
        var network = probe();
        return Map.ofEntries(
            Map.entry("totalUsers", people.size()), Map.entry("students", people.stream().filter(u -> "STUDENT".equals(u.getRole())).count()),
            Map.entry("faculty", people.stream().filter(u -> "FACULTY".equals(u.getRole())).count()),
            Map.entry("experiments", assignments.size()), Map.entry("activeExperiments", assignments.stream().filter(a -> "ACTIVE".equals(a.status)).count()),
            Map.entry("activeSessions", store.attempts().stream().filter(a -> "RUNNING".equals(a.status)).count()),
            Map.entry("submissions", store.submissions().size()), Map.entry("experimentServers", servers().size()),
            Map.entry("systemStatus", Map.of("api", "ONLINE", "database", "ONLINE", "networkService", network, "tcpServer", network)));
    }
    private String probe() {
        try {
            var client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build();
            var response = client.send(HttpRequest.newBuilder(URI.create(networkUrl + "/health")).timeout(Duration.ofSeconds(3)).GET().build(),
                HttpResponse.BodyHandlers.ofString());
            return response.statusCode() == 200 && response.body().contains("\"ONLINE\"") ? "ONLINE" : "OFFLINE";
        } catch (Exception e) {
            if (e instanceof InterruptedException) Thread.currentThread().interrupt();
            return "OFFLINE";
        }
    }
}
