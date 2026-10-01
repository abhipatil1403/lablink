package edu.lablink;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Persistence models; controllers return explicit DTOs rather than traversing entity graphs. */
public final class Model {
    private Model() {}
    @Entity(name = "Role") @Table(name = "roles")
    public static class Role {
        @Id @Column(length = 20) public String name;
        public String description;
    }
    @Entity(name = "Assignment") @Table(name = "assignments")
    public static class Assignment {
        @Id public UUID id;
        public String title;
        @Column(columnDefinition = "text") public String description;
        public String protocol;
        public String difficulty;
        public String status;
        @Column(unique = true) public String slug;
        @JdbcTypeCode(SqlTypes.JSON) public List<String> requirements;
        @JdbcTypeCode(SqlTypes.JSON) public List<String> concepts;
        @JdbcTypeCode(SqlTypes.JSON) public Map<String, Object> metadata;
        public Instant deadline;
        public Instant createdAt;
        public Instant updatedAt;
    }
    @Entity(name = "AssignmentTestCase") @Table(name = "assignment_test_cases")
    public static class TestCase {
        @Id public UUID id = UUID.randomUUID();
        @ManyToOne(optional = false) @JoinColumn(name = "assignment_id") public Assignment assignment;
        public String name;
        public String type;
        public int weight;
        public boolean enabled = true;
        @JdbcTypeCode(SqlTypes.JSON) public Map<String, Object> configuration;
    }
    @Entity(name = "AssignmentAttempt") @Table(name = "assignment_attempts")
    public static class Attempt {
        @Id public UUID id = UUID.randomUUID();
        @ManyToOne(optional = false) @JoinColumn(name = "student_id") public UserEntity student;
        @ManyToOne(optional = false) @JoinColumn(name = "assignment_id") public Assignment assignment;
        public String status = "STARTING";
        public int attemptNumber;
        @Column(columnDefinition = "text") public String solution = "";
        @Column(columnDefinition = "text") public String executionLog = "";
        @Column(columnDefinition = "text") public String networkLog = "";
        public BigDecimal automatedScore;
        public Instant startedAt = Instant.now();
        public Instant endedAt;
        @Version public long version;
    }
    @Entity(name = "Submission") @Table(name = "submissions")
    public static class Submission {
        @Id public UUID id = UUID.randomUUID();
        @ManyToOne(optional = false) @JoinColumn(name = "student_id") public UserEntity student;
        @ManyToOne(optional = false) @JoinColumn(name = "assignment_id") public Assignment assignment;
        @OneToOne(optional = false) @JoinColumn(name = "attempt_id", unique = true) public Attempt attempt;
        @Column(columnDefinition = "text") public String solution;
        @Column(columnDefinition = "text") public String executionOutput;
        @Column(columnDefinition = "text") public String networkLog;
        public BigDecimal automatedScore;
        public BigDecimal facultyGrade;
        @Column(columnDefinition = "text") public String facultyFeedback;
        public String status = "SUBMITTED";
        public Instant submittedAt = Instant.now();
        public Instant reviewedAt;
    }
    @Entity(name = "SubmissionTestResult") @Table(name = "submission_test_results")
    public static class TestResult {
        @Id public UUID id = UUID.randomUUID();
        @ManyToOne(optional = false) @JoinColumn(name = "attempt_id") public Attempt attempt;
        @ManyToOne @JoinColumn(name = "submission_id") public Submission submission;
        @ManyToOne(optional = false) @JoinColumn(name = "test_case_id") public TestCase testCase;
        public boolean passed;
        @Column(columnDefinition = "text") public String output;
        public Instant createdAt = Instant.now();
    }
    @Entity(name = "FacultyReview") @Table(name = "faculty_reviews")
    public static class Review {
        @Id public UUID id = UUID.randomUUID();
        @ManyToOne(optional = false) @JoinColumn(name = "submission_id") public Submission submission;
        @ManyToOne(optional = false) @JoinColumn(name = "faculty_id") public UserEntity faculty;
        public BigDecimal grade;
        @Column(columnDefinition = "text") public String feedback;
        public String status;
        public Instant createdAt = Instant.now();
    }
    @Entity(name = "NetworkServer") @Table(name = "network_servers")
    public static class Server {
        @Id public UUID id = UUID.randomUUID();
        public String name;
        public String service;
        public String address;
        public int port;
        public String protocol;
        public String status = "ACTIVE";
        public Instant lastHeartbeat;
    }
    @Entity(name = "NetworkSession") @Table(name = "network_sessions")
    public static class NetworkSession {
        @Id public UUID id = UUID.randomUUID();
        @OneToOne(optional = false) @JoinColumn(name = "attempt_id", unique = true) public Attempt attempt;
        @ManyToOne(optional = false) @JoinColumn(name = "server_id") public Server server;
        public String status = "STARTING";
        public Instant startedAt = Instant.now();
        public Instant endedAt;
    }
    @Entity(name = "AuditLog") @Table(name = "audit_logs")
    public static class Audit {
        @Id public UUID id = UUID.randomUUID();
        @ManyToOne @JoinColumn(name = "actor_id") public UserEntity actor;
        public String action;
        public String resource;
        @Column(columnDefinition = "text") public String details;
        public Instant createdAt = Instant.now();
    }
}
