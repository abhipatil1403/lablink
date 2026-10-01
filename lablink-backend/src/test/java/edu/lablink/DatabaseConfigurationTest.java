package edu.lablink;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class DatabaseConfigurationTest {
    @Test void renderConnectionUriIsConvertedWithoutCredentialsInJdbcUrl() {
        var result = DatabaseConfiguration.connection("postgresql://college:example%3Avalue%2B@db.example:5432/lablink?sslmode=require", "", "");
        assertEquals("jdbc:postgresql://db.example:5432/lablink?sslmode=require", result.url());
        assertEquals("college", result.username());
        assertEquals("example:value+", result.password());
        assertFalse(result.url().contains("example:value"));
    }
    @Test void jdbcLocalConfigurationIsPreserved() {
        var result = DatabaseConfiguration.connection("jdbc:postgresql://localhost:5432/lablink", "college", "");
        assertEquals("college", result.username());
        assertEquals("", result.password());
    }
    @Test void unsupportedUrlsAreRejected() {
        assertThrows(IllegalArgumentException.class, () -> DatabaseConfiguration.connection("https://db.example/lablink", "", ""));
        assertThrows(IllegalArgumentException.class, () -> DatabaseConfiguration.connection("db.example/lablink", "", ""));
    }
}
