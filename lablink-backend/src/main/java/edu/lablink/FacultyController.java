package edu.lablink;

import edu.lablink.Model.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/faculty") @Transactional
public class FacultyController {
    private final LabStore store;
    private final UserJpaRepository users;
    public FacultyController(LabStore store, UserJpaRepository users) { this.store = store; this.users = users; }
    @GetMapping("/dashboard") public Map<String, Object> dashboard() {
        var assignments = store.all(Assignment.class, "Assignment");
        var attempts = store.attempts(); var submissions = store.submissions();
        return Map.of("totalExperiments", assignments.size(), "activeExperiments", assignments.stream().filter(a -> "ACTIVE".equals(a.status)).count(),
            "activeSessions", attempts.stream().filter(a -> "RUNNING".equals(a.status)).count(),
            "totalSubmissions", submissions.size(), "pendingReviews", submissions.stream().filter(s -> "SUBMITTED".equals(s.status)).count(),
            "recentSessions", attempts.stream().limit(10).map(store::attempt).toList(),
            "pendingSubmissions", submissions.stream().filter(s -> "SUBMITTED".equals(s.status)).limit(10).map(store::submission).toList());
    }
    @GetMapping("/students") public List<UserEntity> students() {
        return users.findAll().stream().filter(u -> "STUDENT".equals(u.getRole())).toList();
    }
    @GetMapping("/sessions") public List<Map<String, Object>> sessions(
            @RequestParam(required = false) UUID assignmentId, @RequestParam(required = false) UUID experimentId,
            @RequestParam(required = false) String status, @RequestParam(required = false) String date) {
        UUID assignment = assignmentId == null ? experimentId : assignmentId;
        return store.attempts().stream()
            .filter(a -> assignment == null || a.assignment.id.equals(assignment))
            .filter(a -> status == null || status.isBlank() || a.status.equals(status))
            .filter(a -> date == null || date.isBlank() || a.startedAt.toString().startsWith(date))
            .map(store::attempt).toList();
    }
    @GetMapping("/sessions/{id}") public Map<String, Object> session(@PathVariable UUID id) { return store.attempt(store.get(Attempt.class, id)); }
    @GetMapping("/submissions") public List<Map<String, Object>> submissions() { return store.submissions().stream().map(store::submission).toList(); }
    @GetMapping("/submissions/{id}") public Map<String, Object> submission(@PathVariable UUID id) { return store.submission(store.get(Submission.class, id)); }
    record ReviewBody(@NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal grade,
                      @NotBlank @Size(max = 10000) String feedback, @Pattern(regexp = "REVIEWED|RETURNED|REJECTED") String status) {}
    @PatchMapping("/submissions/{id}/review")
    public Map<String, Object> review(@PathVariable UUID id, @Valid @RequestBody ReviewBody body) {
        store.review(id, body.grade(), body.feedback(), body.status() == null ? "REVIEWED" : body.status());
        return submission(id);
    }
}
