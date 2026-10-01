package edu.lablink;

import edu.lablink.Model.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api") @Transactional
public class SessionController {
    private final LabStore store;
    public SessionController(LabStore store) { this.store = store; }
    record Start(@NotNull UUID assignmentId) {}
    @PostMapping("/sessions") @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> start(@Valid @RequestBody Start body) { return store.attempt(store.start(body.assignmentId())); }
    @GetMapping("/sessions") public List<Map<String, Object>> attempts() {
        return store.attempts().stream().filter(a -> a.student.getId().equals(Access.user().getId())).map(store::attempt).toList();
    }
    @GetMapping("/sessions/{id}") public Map<String, Object> attempt(@PathVariable UUID id) {
        var a = store.get(Attempt.class, id); Access.owner(a.student); return store.attempt(a);
    }
    @PostMapping("/sessions/{id}/submit") @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> submit(@PathVariable UUID id) { return store.submission(store.submit(id)); }
    @GetMapping("/submissions") public List<Map<String, Object>> submissions() {
        return store.submissions().stream().filter(s -> s.student.getId().equals(Access.user().getId())).map(store::submission).toList();
    }
    @GetMapping("/submissions/{id}") public Map<String, Object> submission(@PathVariable UUID id) {
        var s = store.get(Submission.class, id); Access.owner(s.student); return store.submission(s);
    }
}
