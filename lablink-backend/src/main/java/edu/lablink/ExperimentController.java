package edu.lablink;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/experiments")
public class ExperimentController {
    private final FirestoreRepository repository;

    public ExperimentController(FirestoreRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Map<String, Object>> all() {
        return repository.all("experiments");
    }

    @GetMapping("/{id}")
    public Map<String, Object> one(@PathVariable String id) {
        Map<String, Object> experiment = repository.find("experiments", id);
        if (experiment == null) throw new ApiException(HttpStatus.NOT_FOUND, "Experiment not found");
        return experiment;
    }

    public record ExperimentInput(@NotBlank @Size(max = 120) String title,
            @NotBlank @Size(max = 500) String description,
            @NotBlank @Size(max = 1000) String objective,
            @NotEmpty List<@NotBlank String> instructions,
            @NotBlank String protocol, @NotBlank String difficulty,
            @NotBlank @Size(max = 500) String expectedOutput,
            @NotBlank @Size(max = 200) String serverRequirement,
            List<String> networkingConcepts) {}

    public record StatusInput(@NotBlank String status) {}

    @PostMapping
    public Map<String, Object> create(@Valid @RequestBody ExperimentInput input, HttpServletRequest request) {
        Access.requireRole(request, "FACULTY");
        String id = UUID.randomUUID().toString();
        Map<String, Object> data = fields(input);
        data.put("id", id);
        data.put("status", "COMING_SOON");
        data.put("createdAt", Instant.now().toString());
        repository.create("experiments", id, data);
        return data;
    }

    @PutMapping("/{id}")
    public Map<String, Object> update(@PathVariable String id, @Valid @RequestBody ExperimentInput input,
            HttpServletRequest request) {
        Access.requireRole(request, "FACULTY");
        Map<String, Object> existing = new HashMap<>(one(id));
        Map<String, Object> data = fields(input);
        if ("ACTIVE".equals(existing.get("status")) && !"tcp-client-server".equals(data.get("experimentType"))) {
            throw new ApiException(HttpStatus.CONFLICT, "Deactivate the experiment before changing its protocol");
        }
        repository.update("experiments", id, data);
        existing.putAll(data);
        return existing;
    }

    @PatchMapping("/{id}/status")
    public Map<String, Object> status(@PathVariable String id, @Valid @RequestBody StatusInput input,
            HttpServletRequest request) {
        Access.requireRole(request, "FACULTY");
        Map<String, Object> existing = new HashMap<>(one(id));
        if (!List.of("ACTIVE", "INACTIVE", "COMING_SOON").contains(input.status())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid experiment status");
        }
        if ("ACTIVE".equals(input.status()) && !"tcp-client-server".equals(existing.get("experimentType"))) {
            throw new ApiException(HttpStatus.CONFLICT, "This protocol does not have a live experiment server yet");
        }
        repository.update("experiments", id, Map.of("status", input.status(), "updatedAt", Instant.now().toString()));
        existing.put("status", input.status());
        return existing;
    }

    private Map<String, Object> fields(ExperimentInput input) {
        if (!List.of("TCP", "UDP", "DNS", "HTTP", "ICMP").contains(input.protocol())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid protocol");
        }
        if (!List.of("EASY", "MEDIUM", "HARD").contains(input.difficulty())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid difficulty");
        }
        Map<String, Object> data = new HashMap<>();
        data.put("title", input.title().trim());
        data.put("description", input.description().trim());
        data.put("objective", input.objective().trim());
        data.put("instructions", input.instructions());
        data.put("protocol", input.protocol());
        data.put("difficulty", input.difficulty());
        data.put("expectedOutput", input.expectedOutput().trim());
        data.put("serverRequirement", input.serverRequirement().trim());
        data.put("networkingConcepts", input.networkingConcepts() == null ? List.of() : input.networkingConcepts());
        data.put("experimentType", input.protocol().equals("TCP") ? "tcp-client-server" : input.protocol().toLowerCase());
        data.put("updatedAt", Instant.now().toString());
        return data;
    }
}
