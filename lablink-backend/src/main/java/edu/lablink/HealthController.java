package edu.lablink;

import java.util.Map;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {
    private final JdbcTemplate database;
    public HealthController(JdbcTemplate database) { this.database = database; }
    @GetMapping("/api/health")
    public ResponseEntity<Map<String, String>> health() {
        try {
            database.queryForObject("SELECT 1", Integer.class);
            return ResponseEntity.ok(Map.of("status", "ONLINE", "database", "ONLINE"));
        } catch (DataAccessException e) {
            return ResponseEntity.status(503).body(Map.of("status", "OFFLINE", "database", "OFFLINE"));
        }
    }
}
