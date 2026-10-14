package edu.lablink;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class HealthControllerTest {
    @Test void reachableDatabaseIsHealthy() {
        var database = mock(JdbcTemplate.class);
        when(database.queryForObject("SELECT 1", Integer.class)).thenReturn(1);
        var response = new HealthController(database).health();
        assertEquals(200, response.getStatusCode().value());
        assertEquals("ONLINE", response.getBody().get("database"));
    }
    @Test void databaseFailureReturnsUnavailableWithoutConnectionDetails() {
        var database = mock(JdbcTemplate.class);
        when(database.queryForObject("SELECT 1", Integer.class))
            .thenThrow(new DataAccessResourceFailureException("internal connection details"));
        var response = new HealthController(database).health();
        assertEquals(503, response.getStatusCode().value());
        assertEquals("OFFLINE", response.getBody().get("database"));
        assertFalse(response.getBody().toString().contains("internal"));
    }
}
