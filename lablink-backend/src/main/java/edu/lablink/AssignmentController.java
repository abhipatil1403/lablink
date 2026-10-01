package edu.lablink;

import edu.lablink.Model.Assignment;
import java.util.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

@RestController @RequestMapping("/api/assignments") @Transactional
public class AssignmentController {
    private final LabStore store;
    public AssignmentController(LabStore store) { this.store = store; }
    @GetMapping public List<Map<String, Object>> list() {
        return store.all(Assignment.class, "Assignment").stream().sorted(Comparator.comparing(a -> a.id)).map(store::assignment).toList();
    }
    @GetMapping("/{id}") public Map<String, Object> one(@PathVariable UUID id) {
        return store.assignment(store.get(Assignment.class, id));
    }
}
