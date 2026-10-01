package edu.lablink;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/assignments")
public class AssignmentController {
    private final FirestoreRepository repository;
    public AssignmentController(FirestoreRepository repository) { this.repository = repository; }

    @GetMapping
    public List<Map<String, Object>> all(HttpServletRequest request) { Access.requireRole(request, "STUDENT"); return repository.all("assignments"); }

    @GetMapping("/{id}")
    public Map<String, Object> one(@PathVariable String id, HttpServletRequest request) {
        Access.requireRole(request, "STUDENT");
        Map<String, Object> assignment = repository.find("assignments", id);
        if (assignment == null) throw new ApiException(HttpStatus.NOT_FOUND, "Assignment not found");
        return assignment;
    }
}
