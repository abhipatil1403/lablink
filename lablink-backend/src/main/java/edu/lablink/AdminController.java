package edu.lablink;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.UserRecord;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final FirestoreRepository repository;
    private final FirebaseAuth auth;
    private final String networkUrl;
    private final String tcpHost;
    private final int tcpPort;

    public AdminController(FirestoreRepository repository, FirebaseAuth auth,
            @Value("${lablink.network-url}") String networkUrl,
            @Value("${lablink.tcp-host}") String tcpHost,
            @Value("${lablink.tcp-port}") int tcpPort) {
        this.repository = repository;
        this.auth = auth;
        this.networkUrl = networkUrl;
        this.tcpHost = tcpHost;
        this.tcpPort = tcpPort;
    }

    public record StatusInput(@NotBlank String status) {}
    public record RoleInput(@NotBlank String role) {}

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard(HttpServletRequest request) {
        Access.requireRole(request, "ADMIN");
        List<Map<String, Object>> users = repository.all("users");
        List<Map<String, Object>> experiments = repository.all("experiments");
        List<Map<String, Object>> sessions = repository.all("sessions");
        List<Map<String, Object>> submissions = repository.all("submissions");
        List<Map<String, Object>> servers = repository.all("experimentServers");
        return Map.of(
                "totalUsers", users.size(),
                "students", users.stream().filter(item -> "STUDENT".equals(item.get("role"))).count(),
                "faculty", users.stream().filter(item -> "FACULTY".equals(item.get("role"))).count(),
                "experiments", experiments.size(),
                "activeExperiments", experiments.stream().filter(item -> "ACTIVE".equals(item.get("status"))).count(),
                "activeSessions", sessions.stream().filter(item -> List.of("STARTING", "RUNNING").contains(item.get("status"))).count(),
                "submissions", submissions.size(),
                "experimentServers", servers.size(),
                "systemStatus", Map.of("api", "ONLINE", "database", "ONLINE", "networkService", networkStatus(), "tcpServer", tcpStatus()));
    }

    @GetMapping("/users")
    public List<Map<String, Object>> users(HttpServletRequest request) {
        Access.requireRole(request, "ADMIN");
        return repository.all("users");
    }

    @PatchMapping("/users/{uid}/status")
    public Map<String, Object> userStatus(@PathVariable String uid, @Valid @RequestBody StatusInput input,
            HttpServletRequest request) throws Exception {
        Access.requireRole(request, "ADMIN");
        if (!List.of("ACTIVE", "DISABLED").contains(input.status())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid user status");
        }
        if (Access.uid(request).equals(uid) && input.status().equals("DISABLED")) {
            throw new ApiException(HttpStatus.CONFLICT, "You cannot disable your own admin account");
        }
        Map<String, Object> user = requireUser(uid);
        auth.updateUser(new UserRecord.UpdateRequest(uid).setDisabled(input.status().equals("DISABLED")));
        repository.update("users", uid, Map.of("status", input.status()));
        Map<String, Object> updated = new HashMap<>(user);
        updated.put("status", input.status());
        return updated;
    }

    @PatchMapping("/users/{uid}/role")
    public Map<String, Object> userRole(@PathVariable String uid, @Valid @RequestBody RoleInput input,
            HttpServletRequest request) {
        Access.requireRole(request, "ADMIN");
        if (!List.of("STUDENT", "FACULTY", "ADMIN").contains(input.role())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid user role");
        }
        if (Access.uid(request).equals(uid) && !input.role().equals("ADMIN")) {
            throw new ApiException(HttpStatus.CONFLICT, "You cannot remove your own admin access");
        }
        Map<String, Object> user = requireUser(uid);
        repository.update("users", uid, Map.of("role", input.role()));
        Map<String, Object> updated = new HashMap<>(user);
        updated.put("role", input.role());
        return updated;
    }

    @GetMapping("/servers")
    public List<Map<String, Object>> servers(HttpServletRequest request) {
        Access.requireRole(request, "ADMIN");
        return repository.all("experimentServers").stream().map(server -> {
            Map<String, Object> result = new HashMap<>(server);
            result.put("status", "tcp-local".equals(server.get("id")) ? tcpStatus() : "UNKNOWN");
            return result;
        }).toList();
    }

    @GetMapping("/experiments")
    public List<Map<String, Object>> experiments(HttpServletRequest request) {
        Access.requireRole(request, "ADMIN");
        return repository.all("experiments");
    }

    @PatchMapping("/experiments/{id}/status")
    public Map<String, Object> experimentStatus(@PathVariable String id, @Valid @RequestBody StatusInput input,
            HttpServletRequest request) {
        Access.requireRole(request, "ADMIN");
        Map<String, Object> experiment = repository.find("experiments", id);
        if (experiment == null) throw new ApiException(HttpStatus.NOT_FOUND, "Experiment not found");
        if (!List.of("ACTIVE", "INACTIVE", "COMING_SOON").contains(input.status())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid experiment status");
        }
        if (input.status().equals("ACTIVE") && !"tcp-client-server".equals(experiment.get("experimentType"))) {
            throw new ApiException(HttpStatus.CONFLICT, "This protocol does not have a live experiment server yet");
        }
        repository.update("experiments", id, Map.of("status", input.status(), "updatedAt", Instant.now().toString()));
        Map<String, Object> updated = new HashMap<>(experiment);
        updated.put("status", input.status());
        return updated;
    }

    private Map<String, Object> requireUser(String uid) {
        Map<String, Object> user = repository.find("users", uid);
        if (user == null) throw new ApiException(HttpStatus.NOT_FOUND, "User not found");
        return user;
    }

    private String networkStatus() {
        try {
            HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(1)).build();
            HttpRequest request = HttpRequest.newBuilder(URI.create(networkUrl + "/health"))
                    .timeout(Duration.ofSeconds(2)).GET().build();
            return client.send(request, HttpResponse.BodyHandlers.discarding()).statusCode() == 200 ? "ONLINE" : "OFFLINE";
        } catch (Exception error) {
            if (error instanceof InterruptedException) Thread.currentThread().interrupt();
            return "OFFLINE";
        }
    }

    private String tcpStatus() {
        if (tcpHost.isBlank() || tcpPort <= 0) return "UNKNOWN";
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(tcpHost, tcpPort), 800);
            return "ONLINE";
        } catch (Exception error) {
            return "OFFLINE";
        }
    }
}
