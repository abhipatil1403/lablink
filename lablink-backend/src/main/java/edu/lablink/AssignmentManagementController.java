package edu.lablink;

import edu.lablink.Model.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping({"/api/faculty/assignments", "/api/admin/assignments"}) @Transactional
public class AssignmentManagementController {
    private final LabStore store;
    public AssignmentManagementController(LabStore store) { this.store = store; }
    @GetMapping public List<Map<String, Object>> assignments() {
        return store.all(Assignment.class, "Assignment").stream().sorted(Comparator.comparing(a -> a.id)).map(store::assignment).toList();
    }
    record Edit(@NotBlank @Size(max = 160) String title, @NotBlank @Size(max = 10000) String description,
                @NotBlank @Size(max = 10000) String objective, @NotNull @Size(min = 1, max = 30) List<String> instructions,
                @NotBlank @Size(max = 10000) String expectedBehavior, @NotNull @Size(min = 1, max = 30) List<String> requirements,
                @NotNull @Size(min = 1, max = 30) List<String> constraints, @NotNull @Size(min = 1, max = 30) List<String> networkingConcepts,
                @NotNull @Pattern(regexp = "EASY|MEDIUM|HARD") String difficulty, Instant deadline) {}
    @PutMapping("/{id}") public Map<String, Object> update(@PathVariable UUID id, @Valid @RequestBody Edit body) {
        var a = store.get(Assignment.class, id); a.title = body.title(); a.description = body.description();
        a.requirements = body.requirements(); a.concepts = body.networkingConcepts(); a.difficulty = body.difficulty();
        a.deadline = body.deadline(); a.updatedAt = Instant.now();
        a.metadata = new LinkedHashMap<>(a.metadata);
        a.metadata.put("objective", body.objective()); a.metadata.put("instructions", body.instructions());
        a.metadata.put("expectedBehavior", body.expectedBehavior()); a.metadata.put("constraints", body.constraints());
        store.audit("UPDATE_ASSIGNMENT", id, a.title); return store.assignment(a);
    }
    record Status(@Pattern(regexp = "ACTIVE|INACTIVE") @NotNull String status) {}
    @PatchMapping("/{id}/status") public Map<String, Object> status(@PathVariable UUID id, @Valid @RequestBody Status body) {
        var a = store.get(Assignment.class, id); a.status = body.status(); a.updatedAt = Instant.now();
        store.audit("ASSIGNMENT_STATUS", id, body.status()); return store.assignment(a);
    }
    @GetMapping("/{id}/tests") public List<Map<String, Object>> tests(@PathVariable UUID id) {
        return store.tests(store.get(Assignment.class, id)).stream().map(this::testDto).toList();
    }
    private Map<String, Object> testDto(TestCase t) {
        return Map.of("id", t.id, "name", t.name, "type", t.type, "weight", t.weight, "enabled", t.enabled, "configuration", t.configuration);
    }
    record TestEdit(@NotBlank @Size(max = 255) String name, @Min(1) @Max(100) int weight, boolean enabled,
                    @NotNull Map<String, Object> configuration) {}
    @PostMapping("/{id}/tests") @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> addTest(@PathVariable UUID id, @Valid @RequestBody TestEdit body) {
        var a = store.get(Assignment.class, id);
        if (store.tests(a).size() >= 20) throw new ApiException(HttpStatus.CONFLICT, "At most 20 tests per assignment");
        var t = new TestCase(); t.assignment = a; t.type = a.slug; apply(t, body); store.save(t);
        store.audit("CREATE_TEST", t.id, body.name()); return testDto(t);
    }
    @PutMapping("/{id}/tests/{testId}")
    public Map<String, Object> editTest(@PathVariable UUID id, @PathVariable UUID testId, @Valid @RequestBody TestEdit body) {
        var t = store.get(TestCase.class, testId);
        if (!t.assignment.id.equals(id)) throw new ApiException(HttpStatus.NOT_FOUND, "Test not found for this assignment");
        apply(t, body); store.audit("UPDATE_TEST", testId, body.name()); return testDto(t);
    }
    private void apply(TestCase t, TestEdit b) {
        if (!(b.configuration().get("input") instanceof Map))
            throw new ApiException(HttpStatus.BAD_REQUEST, "Test configuration requires an input object");
        t.name = b.name(); t.weight = b.weight(); t.enabled = b.enabled(); t.configuration = b.configuration();
    }
}
