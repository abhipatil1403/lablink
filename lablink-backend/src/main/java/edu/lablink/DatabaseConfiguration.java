package edu.lablink;

import com.zaxxer.hikari.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;

@Configuration
public class DatabaseConfiguration {
    record Connection(String url, String username, String password) {}
    static Connection connection(String url, String username, String password) {
        if (url.startsWith("jdbc:postgresql:")) return new Connection(url, username, password);
        try {
            URI uri = URI.create(url);
            if (!("postgres".equals(uri.getScheme()) || "postgresql".equals(uri.getScheme())) ||
                uri.getHost() == null || uri.getPath() == null || uri.getPath().length() < 2)
                throw new IllegalArgumentException();
            if (uri.getRawUserInfo() != null) {
                String[] values = uri.getRawUserInfo().split(":", 2);
                username = decode(values[0]);
                if (values.length > 1) password = decode(values[1]);
            }
            String jdbc = "jdbc:postgresql://" + uri.getHost() + (uri.getPort() == -1 ? "" : ":" + uri.getPort()) +
                uri.getRawPath() + (uri.getRawQuery() == null ? "" : "?" + uri.getRawQuery());
            return new Connection(jdbc, username, password);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("DATABASE_URL must be a PostgreSQL JDBC URL or a postgres:// connection URI");
        }
    }
    private static String decode(String value) {
        return URLDecoder.decode(value.replace("+", "%2B"), StandardCharsets.UTF_8);
    }
    @Bean DataSource dataSource(@Value("${spring.datasource.url}") String url,
            @Value("${spring.datasource.username}") String username,
            @Value("${spring.datasource.password}") String password) {
        Connection connection = connection(url, username, password);
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(connection.url()); config.setUsername(connection.username()); config.setPassword(connection.password());
        config.setMaximumPoolSize(6); config.setMinimumIdle(1); config.setConnectionTimeout(8000);
        return new HikariDataSource(config);
    }
}
