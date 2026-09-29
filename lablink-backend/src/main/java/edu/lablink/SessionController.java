package edu.lablink;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class SessionController {
    private final FirestoreRepository repository;

    public SessionController(FirestoreRepository repository) {
        this.repository = repository;
    }

    record StartRequest(@NotBlank String experimentId) {}
    record SubmissionRequest(@NotBlank @Size(max = 2000) String result) {}

    @PostMapping("/sessions")
    public Map<String, Object> start(@Valid @RequestBody StartRequest input, HttpServletRequest request) {
        Access.requireRole(request, "STUDENT");
        Map<String, Object> experiment = repository.find("experiments", input.experimentId());
        if (experiment == null) throw new ApiException(HttpStatus.NOT_FOUND, "Experiment not found");
        if (!"ACTIVE".equals(experiment.get("status")) || !"tcp-client-server".equals(experiment.get("experimentType"))) {
            throw new ApiException(HttpStatus.CONFLICT, "This experiment is not available yet");
        }
        Map<String, Object> server = repository.find("experimentServers", "tcp-local");
        if (server == null) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Experiment server is not configured");
        String id = UUID.randomUUID().toString();
        Map<String, Object> session = new HashMap<>();
        session.put("id", id);
        session.put("studentId", Access.uid(request));
        session.put("experimentId", input.experimentId());
        session.put("experimentType", experiment.get("experimentType"));
        session.put("serverId", "tcp-local");
        session.put("serverAddress", server.get("address") + ":" + server.get("port"));
        session.put("status", "STARTING");
        session.put("startTime", Instant.now().toString());
        session.put("endTime", null);
        session.put("createdAt", Instant.now().toString());
        session.put("logs", List.of());
        repository.create("sessions", id, session);
        return session;
    }

    @GetMapping("/sessions/{id}")
    public Map<String, Object> session(@PathVariable String id, HttpServletRequest request) {
        Access.requireRole(request, "STUDENT");
        Map<String, Object> session = requireSession(id);
        Access.requireOwner(request, (String) session.get("studentId"));
        return session;
    }

    @PostMapping("/sessions/{id}/submit")
    public Map<String, Object> submit(@PathVariable String id, @Valid @RequestBody SubmissionRequest input,
            HttpServletRequest request) {
        Access.requireRole(request, "STUDENT");
        Map<String, Object> session = requireSession(id);
        Access.requireOwner(request, (String) session.get("studentId"));
        if (repository.find("submissions", id) != null) {
            throw new ApiException(HttpStatus.CONFLICT, "Session already submitted");
        }
        if (!List.of("RUNNING", "STOPPED").contains(session.get("status"))) {
            throw new ApiException(HttpStatus.CONFLICT, "Session cannot be submitted");
        }
        Object transcript = session.get("logs");
        if (!(transcript instanceof List<?> logs) || logs.stream().noneMatch(line ->
                line instanceof Map<?, ?> entry && "SERVER".equals(entry.get("direction")))) {
            throw new ApiException(HttpStatus.CONFLICT, "Run at least one command before submitting");
        }
        Map<String, Object> submission = new HashMap<>();
        submission.put("id", id);
        submission.put("sessionId", id);
        submission.put("studentId", Access.uid(request));
        submission.put("experimentId", session.get("experimentId"));
        submission.put("logs", transcript);
        submission.put("result", input.result().trim());
        submission.put("grade", null);
        submission.put("feedback", null);
        submission.put("status", "SUBMITTED");
        submission.put("submittedAt", Instant.now().toString());
        submission.put("reviewedAt", null);
        repository.create("submissions", id, submission);
        repository.update("sessions", id, Map.of("status", "COMPLETED", "endTime", Instant.now().toString()));
        return submission;
    }

    @GetMapping("/submissions")
    public List<Map<String, Object>> history(HttpServletRequest request) {
        Access.requireRole(request, "STUDENT");
        return repository.all("submissions").stream()
                .filter(item -> Access.uid(request).equals(item.get("studentId")))
                .sorted(Comparator.comparing(item -> (String) item.get("submittedAt"), Comparator.reverseOrder()))
                .toList();
    }

    @GetMapping("/submissions/{id}")
    public Map<String, Object> submission(@PathVariable String id, HttpServletRequest request) {
        Access.requireRole(request, "STUDENT");
        Map<String, Object> submission = repository.find("submissions", id);
        if (submission == null) throw new ApiException(HttpStatus.NOT_FOUND, "Submission not found");
        Access.requireOwner(request, (String) submission.get("studentId"));
        return submission;
    }

    Map<String, Object> requireSession(String id) {
        Map<String, Object> session = repository.find("sessions", id);
        if (session == null) throw new ApiException(HttpStatus.NOT_FOUND, "Session not found");
        return session;
    }
}
