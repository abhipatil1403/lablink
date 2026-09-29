package edu.lablink;

import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
}
