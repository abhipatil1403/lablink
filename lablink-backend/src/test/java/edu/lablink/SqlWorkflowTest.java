package edu.lablink;

import com.fasterxml.jackson.databind.*;
import edu.lablink.Model.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

@SpringBootTest(properties = {
    "spring.config.import=",
    "spring.datasource.url=${TEST_DATABASE_URL:jdbc:postgresql://127.0.0.1:55432/lablink_test}",
    "spring.datasource.username=${TEST_DATABASE_USERNAME:lablink_test}", "spring.datasource.password=",
    "JWT_SECRET=integration-tests-only-not-a-production-secret-1234",
    "lablink.gateway-key=integration-gateway-only-secret-123456789",
    "INITIAL_ADMIN_EMAIL=", "INITIAL_ADMIN_PASSWORD=",
    "lablink.network-url=http://127.0.0.1:1"
})
@AutoConfigureMockMvc
class SqlWorkflowTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserJpaRepository users;
    @Autowired PasswordEncoder passwords;
    @Autowired JwtService jwt;
    String student, other, faculty, admin;
    String studentId;
    static final String KEY = "integration-gateway-only-secret-123456789";
    @BeforeEach void accounts() throws Exception {
        var result = request("POST", "/api/auth/register", null, Map.of("name", "Student", "email", UUID.randomUUID() + "@test.example", "password", "TestPassword123"), 201);
        student = result.get("token").asText(); studentId = result.path("user").path("id").asText();
        other = request("POST", "/api/auth/register", null, Map.of("name", "Other", "email", UUID.randomUUID() + "@test.example", "password", "TestPassword123", "role", "ADMIN"), 201).get("token").asText();
        faculty = account("FACULTY"); admin = account("ADMIN");
    }
    String account(String role) {
        var user = users.save(new UserEntity(role, UUID.randomUUID() + "@test.example", passwords.encode("TestPassword123"), role));
        return jwt.issue(user);
    }
    JsonNode request(String method, String path, String token, Object body, int expected) throws Exception {
        var builder = switch (method) {
            case "POST" -> post(path); case "PUT" -> put(path); case "PATCH" -> patch(path);
            case "OPTIONS" -> options(path); default -> get(path);
        };
        if (token != null) builder.header("Authorization", "Bearer " + token);
        if (path.startsWith("/api/internal")) builder.header("X-LabLink-Gateway-Key", KEY);
        if (body != null) builder.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
        var response = mvc.perform(builder).andReturn().getResponse();
        assertEquals(expected, response.getStatus(), response.getContentAsString());
        return response.getContentAsString().isBlank() ? json.nullNode() : json.readTree(response.getContentAsString());
    }
    @Test void authenticationAndRoleBoundaries() throws Exception {
        request("GET", "/api/auth/me", null, null, 401);
        request("GET", "/api/admin/users", student, null, 403);
        request("GET", "/api/faculty/submissions", admin, null, 403);
        var me = request("GET", "/api/auth/me", student, null, 200);
        assertEquals("STUDENT", me.get("role").asText());
        assertFalse(me.has("passwordHash"));
        assertFalse(me.has("authVersion"));
        request("POST", "/api/auth/login", null, Map.of("email", me.get("email").asText(), "password", "wrong"), 401);
        var login = request("POST", "/api/auth/login", null, Map.of("email", me.get("email").asText(), "password", "TestPassword123"), 200);
        request("POST", "/api/auth/logout", student, null, 204);
        request("GET", "/api/auth/me", login.get("token").asText(), null, 401);
        var fresh = request("POST", "/api/auth/login", null, Map.of("email", me.get("email").asText(), "password", "TestPassword123"), 200);
        request("GET", "/api/auth/me", fresh.get("token").asText(), null, 200);
        assertTrue(users.findById(UUID.fromString(studentId)).orElseThrow().getPasswordHash().startsWith("$2"));
    }
    @Test void allSevenAssignmentsAndOwnership() throws Exception {
        var catalog = request("GET", "/api/assignments", student, null, 200);
        assertEquals(7, catalog.size());
        for (var assignment : catalog) {
            assertEquals("ACTIVE", assignment.get("status").asText());
            assertFalse(assignment.get("testCases").isEmpty());
            var attempt = request("POST", "/api/sessions", student, Map.of("assignmentId", assignment.get("id").asText()), 201);
            request("GET", "/api/sessions/" + attempt.get("id").asText(), other, null, 403);
            request("POST", "/api/sessions/" + attempt.get("id").asText() + "/submit", student, Map.of("automatedScore", 100), 409);
            request("GET", "/api/internal/sessions/" + attempt.get("id").asText() + "/validate", other, null, 403);
        }
    }
    @Test void persistentEvaluationSubmissionAndFacultyReview() throws Exception {
        var id = "00000000-0000-4000-8000-000000000001";
        var attempt = request("POST", "/api/sessions", student, Map.of("assignmentId", id), 201);
        String path = "/api/internal/sessions/" + attempt.get("id").asText();
        var config = request("GET", path + "/validate", student, null, 200);
        var reports = new ArrayList<Map<String, Object>>();
        int total = 0, passed = 0, index = 0;
        for (var test : config.get("evaluationTests")) {
            boolean pass = index++ == 0;
            int weight = test.get("weight").asInt(); total += weight; if (pass) passed += weight;
            reports.add(Map.of("testCaseId", test.get("id").asText(), "passed", pass, "output", pass ? "ok" : "Expected reply missing"));
        }
        mvc.perform(get(path + "/validate").header("Authorization", "Bearer " + student).header("X-LabLink-Gateway-Key", "bad"))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isForbidden());
        request("POST", path + "/begin", student, Map.of("solution", "function solve(input) {return input}"), 200);
        request("POST", path + "/complete", student, Map.of("mode", "test", "output", "Execution output", "networkLog", "Actual TCP records", "results", reports), 200);
        var submission = request("POST", "/api/sessions/" + attempt.get("id").asText() + "/submit", student, null, 201);
        assertEquals(passed * 100.0 / total, submission.get("automatedScore").asDouble(), 0.01);
        assertEquals(reports.size(), submission.get("testResults").size());
        var sid = submission.get("id").asText();
        request("GET", "/api/submissions/" + sid, other, null, 403);
        request("PATCH", "/api/faculty/submissions/" + sid + "/review", student, Map.of("grade", 80, "feedback", "Good"), 403);
        request("PATCH", "/api/faculty/submissions/" + sid + "/review", faculty, Map.of("grade", 101, "feedback", "Too high"), 400);
        request("PATCH", "/api/faculty/submissions/" + sid + "/review", faculty, Map.of("grade", 80, "feedback", "Improve failure handling", "status", "RETURNED"), 200);
        var reviewed = request("GET", "/api/submissions/" + sid, student, null, 200);
        assertEquals(80, reviewed.get("grade").asInt());
        assertEquals("RETURNED", reviewed.get("status").asText());
        assertEquals(1, reviewed.get("reviews").size());
        request("POST", path + "/begin", student, Map.of("solution", "changed"), 409);
        request("POST", "/api/sessions/" + attempt.get("id").asText() + "/submit", student, null, 409);
    }
    @Test void facultyCreationAndImmediateAccountSuspension() throws Exception {
        var body = Map.of("name", "Professor", "email", UUID.randomUUID() + "@test.example", "password", "TestPassword123");
        request("POST", "/api/admin/faculty", student, body, 403);
        var professor = request("POST", "/api/admin/faculty", admin, body, 201);
        assertEquals("FACULTY", professor.get("role").asText()); assertFalse(professor.has("passwordHash"));
        var login = request("POST", "/api/auth/login", null, Map.of("email", body.get("email"), "password", body.get("password")), 200);
        String token = login.get("token").asText();
        request("GET", "/api/faculty/dashboard", token, null, 200);
        request("PATCH", "/api/admin/users/" + professor.get("id").asText() + "/status", admin, Map.of("status", "SUSPENDED"), 200);
        request("GET", "/api/faculty/dashboard", token, null, 401);
    }
    @Test void preflightGetsCorsBeforeAuthentication() throws Exception {
        var response = mvc.perform(options("/api/sessions").header("Origin", "http://localhost:5173")
            .header("Access-Control-Request-Method", "POST").header("Access-Control-Request-Headers", "authorization,content-type")).andReturn().getResponse();
        assertEquals(200, response.getStatus());
        assertEquals("http://localhost:5173", response.getHeader("Access-Control-Allow-Origin"));
        request("GET", "/api/assignments/00000000-0000-4000-8000-999999999999", student, null, 404);
    }
}
