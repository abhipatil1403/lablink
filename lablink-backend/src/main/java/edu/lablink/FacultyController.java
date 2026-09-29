package edu.lablink;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/faculty")
public class FacultyController {
    private final FirestoreRepository repository;

    public FacultyController(FirestoreRepository repository) {
        this.repository = repository;
    }

    public record ReviewInput(@NotNull @Min(0) @Max(100) Integer grade,
            @NotBlank @Size(max = 2000) String feedback) {}

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard(HttpServletRequest request) {
        Access.requireRole(request, "FACULTY");
        List<Map<String, Object>> experiments = repository.all("experiments");
        List<Map<String, Object>> sessions = sessions(request, null, null, null);
        List<Map<String, Object>> submissions = submissions(request);
        return Map.of(
                "totalExperiments", experiments.size(),
                "activeExperiments", experiments.stream().filter(item -> "ACTIVE".equals(item.get("status"))).count(),
                "activeSessions", sessions.stream().filter(item -> List.of("STARTING", "RUNNING").contains(item.get("status"))).count(),
                "pendingReviews", submissions.stream().filter(item -> "SUBMITTED".equals(item.get("status"))).count(),
                "totalSubmissions", submissions.size(),
                "recentSessions", sessions.stream().limit(5).toList(),
                "pendingSubmissions", submissions.stream().filter(item -> "SUBMITTED".equals(item.get("status"))).limit(5).toList());
    }

    @GetMapping("/sessions")
    public List<Map<String, Object>> sessions(HttpServletRequest request,
            @RequestParam(required = false) String experimentId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String date) {
        Access.requireRole(request, "FACULTY");
        var users = index(repository.all("users"));
        var experiments = index(repository.all("experiments"));
        return repository.all("sessions").stream()
                .filter(item -> experimentId == null || experimentId.equals(item.get("experimentId")))
                .filter(item -> status == null || status.equals(item.get("status")))
                .filter(item -> date == null || String.valueOf(item.get("startTime")).startsWith(date))
                .map(item -> enrich(item, users, experiments))
                .sorted(Comparator.comparing(item -> String.valueOf(item.get("startTime")), Comparator.reverseOrder()))
                .toList();
    }

    @GetMapping("/submissions")
    public List<Map<String, Object>> submissions(HttpServletRequest request) {
        Access.requireRole(request, "FACULTY");
        var users = index(repository.all("users"));
        var experiments = index(repository.all("experiments"));
        return repository.all("submissions").stream()
                .map(item -> enrich(item, users, experiments))
                .sorted(Comparator.comparing(item -> String.valueOf(item.get("submittedAt")), Comparator.reverseOrder()))
                .toList();
    }

    @GetMapping("/submissions/{id}")
    public Map<String, Object> submission(@PathVariable String id, HttpServletRequest request) {
        Access.requireRole(request, "FACULTY");
        Map<String, Object> submission = repository.find("submissions", id);
        if (submission == null) throw new ApiException(HttpStatus.NOT_FOUND, "Submission not found");
        return enrich(submission, index(repository.all("users")), index(repository.all("experiments")));
    }

    @PatchMapping("/submissions/{id}/review")
    public Map<String, Object> review(@PathVariable String id, @Valid @RequestBody ReviewInput input,
            HttpServletRequest request) {
        Access.requireRole(request, "FACULTY");
        Map<String, Object> submission = submission(id, request);
        Map<String, Object> fields = Map.of("grade", input.grade(), "feedback", input.feedback().trim(),
                "status", "REVIEWED", "reviewedAt", Instant.now().toString());
        repository.update("submissions", id, fields);
        Map<String, Object> reviewed = new HashMap<>(submission);
        reviewed.putAll(fields);
        return reviewed;
    }

    private Map<String, Map<String, Object>> index(List<Map<String, Object>> items) {
        return items.stream().collect(Collectors.toMap(item -> String.valueOf(item.get("id") == null ? item.get("uid") : item.get("id")),
                Function.identity(), (a, b) -> a));
    }

    private Map<String, Object> enrich(Map<String, Object> item, Map<String, Map<String, Object>> users,
            Map<String, Map<String, Object>> experiments) {
        Map<String, Object> result = new HashMap<>(item);
        Map<String, Object> user = users.get(item.get("studentId"));
        Map<String, Object> experiment = experiments.get(item.get("experimentId"));
        result.put("studentName", user == null ? "Unknown student" : user.get("name"));
        result.put("experimentTitle", experiment == null ? "Unknown experiment" : experiment.get("title"));
        return result;
    }
}
