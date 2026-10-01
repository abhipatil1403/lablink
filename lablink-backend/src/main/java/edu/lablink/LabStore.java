package edu.lablink;

import edu.lablink.Model.*;
import jakarta.persistence.*;
import java.math.*;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @Transactional
public class LabStore {
    @PersistenceContext private EntityManager em;
    public <T> T get(Class<T> type, UUID id) {
        T result = em.find(type, id);
        if (result == null) throw new ApiException(HttpStatus.NOT_FOUND, "Record not found");
        return result;
    }
    public <T> List<T> all(Class<T> type, String entity) {
        return em.createQuery("from " + entity, type).getResultList();
    }
    public List<TestCase> tests(Assignment assignment) {
        return em.createQuery("from AssignmentTestCase t where t.assignment = :a order by t.name", TestCase.class)
            .setParameter("a", assignment).getResultList();
    }
    public List<TestResult> results(Attempt attempt) {
        return em.createQuery("from SubmissionTestResult r where r.attempt = :a order by r.testCase.name", TestResult.class)
            .setParameter("a", attempt).getResultList();
    }
    public void audit(String action, Object resource, String detail) {
        Audit log = new Audit();
        log.actor = em.getReference(UserEntity.class, Access.user().getId());
        log.action = action; log.resource = resource.toString(); log.details = detail;
        em.persist(log);
    }
    public Map<String, Object> assignment(Assignment a) {
        Map<String, Object> dto = new LinkedHashMap<>(a.metadata);
        dto.putAll(Map.of("id", a.id, "title", a.title, "description", a.description, "protocol", a.protocol,
            "difficulty", a.difficulty, "status", a.status, "assignmentType", a.slug,
            "requirements", a.requirements, "networkingConcepts", a.concepts));
        dto.put("deadline", a.deadline);
        dto.put("testCases", tests(a).stream().filter(t -> t.enabled)
            .map(t -> Map.of("id", t.id, "name", t.name, "weight", t.weight)).toList());
        if ("STUDENT".equals(Access.user().getRole())) {
            dto.put("attempts", em.createQuery("select count(a) from AssignmentAttempt a where a.assignment = :a and a.student.id = :s", Long.class)
                .setParameter("a", a).setParameter("s", Access.user().getId()).getSingleResult());
            dto.put("submissionStatus", em.createQuery("select s.status from Submission s where s.assignment = :a and s.student.id = :s order by s.submittedAt desc", String.class)
                .setParameter("a", a).setParameter("s", Access.user().getId()).setMaxResults(1).getResultStream().findFirst().orElse("NOT_SUBMITTED"));
        }
        return dto;
    }
    public Map<String, Object> attempt(Attempt a) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", a.id); dto.put("assignmentId", a.assignment.id); dto.put("experimentId", a.assignment.id);
        dto.put("assignmentTitle", a.assignment.title); dto.put("experimentTitle", a.assignment.title);
        dto.put("assignmentType", a.assignment.slug); dto.put("studentId", a.student.getId()); dto.put("studentName", a.student.getName());
        dto.put("status", a.status); dto.put("attemptNumber", a.attemptNumber); dto.put("startedAt", a.startedAt);
        dto.put("endedAt", a.endedAt); dto.put("solution", a.solution); dto.put("executionOutput", a.executionLog);
        dto.put("networkLog", a.networkLog); dto.put("automatedScore", a.automatedScore);
        dto.put("assignment", assignment(a.assignment));
        dto.put("testResults", results(a).stream().map(this::testResult).toList());
        return dto;
    }
    private Map<String, Object> testResult(TestResult r) {
        return Map.of("testCaseId", r.testCase.id, "name", r.testCase.name, "weight", r.testCase.weight,
            "passed", r.passed, "output", r.output);
    }
    public Map<String, Object> submission(Submission s) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", s.id); dto.put("assignmentId", s.assignment.id); dto.put("experimentId", s.assignment.id);
        dto.put("assignmentTitle", s.assignment.title); dto.put("experimentTitle", s.assignment.title);
        dto.put("studentId", s.student.getId()); dto.put("studentName", s.student.getName());
        dto.put("attemptId", s.attempt.id); dto.put("sessionId", s.attempt.id);
        dto.put("solution", s.solution); dto.put("executionOutput", s.executionOutput); dto.put("networkLog", s.networkLog);
        dto.put("automatedScore", s.automatedScore); dto.put("facultyGrade", s.facultyGrade); dto.put("grade", s.facultyGrade);
        dto.put("facultyFeedback", s.facultyFeedback); dto.put("feedback", s.facultyFeedback);
        dto.put("status", s.status); dto.put("submittedAt", s.submittedAt); dto.put("reviewedAt", s.reviewedAt);
        dto.put("testResults", results(s.attempt).stream().map(this::testResult).toList());
        dto.put("reviews", em.createQuery("from FacultyReview r where r.submission = :s order by r.createdAt", Review.class)
            .setParameter("s", s).getResultList().stream().map(r -> {
                var item = new LinkedHashMap<String, Object>();
                item.put("facultyName", r.faculty.getName()); item.put("grade", r.grade);
                item.put("feedback", r.feedback); item.put("status", r.status); item.put("createdAt", r.createdAt); return item;
            }).toList());
        return dto;
    }
    public List<Attempt> attempts() {
        return em.createQuery("from AssignmentAttempt a order by a.startedAt desc", Attempt.class).getResultList();
    }
    public List<Submission> submissions() {
        return em.createQuery("from Submission s order by s.submittedAt desc", Submission.class).getResultList();
    }
    public Attempt start(UUID assignmentId) {
        Access.role("STUDENT");
        var assignment = get(Assignment.class, assignmentId);
        if (!"ACTIVE".equals(assignment.status))
            throw new ApiException(HttpStatus.CONFLICT, "Assignment is inactive");
        if (assignment.deadline != null && assignment.deadline.isBefore(Instant.now()))
            throw new ApiException(HttpStatus.CONFLICT, "The submission deadline has passed");
        var student = em.find(UserEntity.class, Access.user().getId(), LockModeType.PESSIMISTIC_WRITE);
        Attempt attempt = new Attempt();
        attempt.student = student; attempt.assignment = assignment;
        attempt.attemptNumber = em.createQuery("select coalesce(max(a.attemptNumber),0) from AssignmentAttempt a where a.student = :s and a.assignment = :a", Integer.class)
            .setParameter("s", student).setParameter("a", assignment).getSingleResult() + 1;
        String service = switch (assignment.slug) {
            case "tcp-chat" -> "chat"; case "file-transfer" -> "file"; case "udp-telemetry" -> "udp";
            case "http-api" -> "http"; case "dns-troubleshooting" -> "dns"; case "network-monitor" -> "monitor";
            case "file-search" -> "search"; default -> throw new ApiException(HttpStatus.CONFLICT, "Unknown assignment type");
        };
        Server server = em.createQuery("from NetworkServer s where s.service = :s", Server.class).setParameter("s", service).getSingleResult();
        if (!"ACTIVE".equals(server.status)) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Network service is disabled");
        em.persist(attempt);
        NetworkSession session = new NetworkSession(); session.attempt = attempt; session.server = server; em.persist(session);
        audit("START_ATTEMPT", attempt.id, assignment.title);
        return attempt;
    }
    public Submission submit(UUID id) {
        var attempt = lockedAttempt(id);
        Access.owner(attempt.student);
        if (!"TESTED".equals(attempt.status) || results(attempt).isEmpty())
            throw new ApiException(HttpStatus.CONFLICT, "Run the automated tests before submitting");
        if (attempt.assignment.deadline != null && attempt.assignment.deadline.isBefore(Instant.now()))
            throw new ApiException(HttpStatus.CONFLICT, "The submission deadline has passed");
        var submission = new Submission();
        submission.attempt = attempt; submission.student = attempt.student; submission.assignment = attempt.assignment;
        submission.solution = attempt.solution; submission.executionOutput = attempt.executionLog;
        submission.networkLog = attempt.networkLog; submission.automatedScore = attempt.automatedScore;
        em.persist(submission);
        results(attempt).forEach(r -> r.submission = submission);
        attempt.status = "SUBMITTED"; attempt.endedAt = Instant.now();
        audit("SUBMIT", submission.id, "Automated score: " + submission.automatedScore);
        return submission;
    }
    public Attempt lockedAttempt(UUID id) {
        Attempt attempt = em.find(Attempt.class, id, LockModeType.PESSIMISTIC_WRITE);
        if (attempt == null) throw new ApiException(HttpStatus.NOT_FOUND, "Attempt not found");
        return attempt;
    }
    public void begin(UUID id, String solution) {
        var attempt = lockedAttempt(id); Access.owner(attempt.student);
        if ("SUBMITTED".equals(attempt.status) || "RUNNING".equals(attempt.status))
            throw new ApiException(HttpStatus.CONFLICT, "Attempt cannot start in its current state");
        if (!"ACTIVE".equals(attempt.assignment.status)) throw new ApiException(HttpStatus.CONFLICT, "Assignment is inactive");
        attempt.solution = solution; attempt.status = "RUNNING"; attempt.automatedScore = null;
        results(attempt).forEach(em::remove);
        network(attempt).status = "RUNNING";
    }
    public record Report(UUID testCaseId, boolean passed, String output) {}
    public void complete(UUID id, String mode, String output, String networkLog, List<Report> reports) {
        var attempt = lockedAttempt(id); Access.owner(attempt.student);
        if (!"RUNNING".equals(attempt.status)) throw new ApiException(HttpStatus.CONFLICT, "Attempt is not running");
        attempt.executionLog = output; attempt.networkLog = networkLog; attempt.endedAt = Instant.now();
        if ("test".equals(mode)) {
            var tests = tests(attempt.assignment).stream().filter(t -> t.enabled).toList();
            if (tests.isEmpty() || reports.size() != tests.size() ||
                reports.stream().map(Report::testCaseId).distinct().count() != tests.size())
                throw new ApiException(HttpStatus.BAD_REQUEST, "Every enabled test requires exactly one result");
            int total = 0, earned = 0;
            for (var test : tests) {
                Report report = reports.stream().filter(r -> test.id.equals(r.testCaseId())).findFirst()
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Unknown test result"));
                TestResult result = new TestResult(); result.attempt = attempt; result.testCase = test;
                result.passed = report.passed(); result.output = report.output() == null ? "" : report.output();
                em.persist(result); total += test.weight; if (result.passed) earned += test.weight;
            }
            attempt.automatedScore = BigDecimal.valueOf(earned * 100.0 / total).setScale(2, RoundingMode.HALF_UP);
            attempt.status = "TESTED";
        } else attempt.status = "STARTING";
        network(attempt).status = attempt.status; network(attempt).endedAt = Instant.now();
    }
    private NetworkSession network(Attempt a) {
        return em.createQuery("from NetworkSession s where s.attempt = :a", NetworkSession.class).setParameter("a", a).getSingleResult();
    }
    public Server server(Attempt attempt) { return network(attempt).server; }
    public void failure(UUID id, String message) {
        var a = lockedAttempt(id); Access.owner(a.student);
        if ("RUNNING".equals(a.status)) {
            a.status = "FAILED"; a.executionLog = message; a.endedAt = Instant.now();
            network(a).status = "FAILED"; network(a).endedAt = Instant.now();
        }
    }
    public void review(UUID id, BigDecimal grade, String feedback, String status) {
        var submission = get(Submission.class, id);
        if (!Set.of("REVIEWED", "RETURNED", "REJECTED").contains(status))
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid review status");
        var review = new Review(); review.submission = submission;
        review.faculty = em.getReference(UserEntity.class, Access.user().getId());
        review.grade = grade; review.feedback = feedback; review.status = status; em.persist(review);
        submission.facultyGrade = grade; submission.facultyFeedback = feedback;
        submission.status = status; submission.reviewedAt = Instant.now(); audit("REVIEW", id, status);
    }
    public void save(Object entity) { em.persist(entity); }
}
