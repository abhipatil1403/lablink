package edu.lablink;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.any;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.firebase.auth.FirebaseToken;
import java.util.Map;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;

class SessionControllerTest {
    @Test
    void studentCannotReadAnotherStudentsSession() {
        FirestoreRepository repository = mock(FirestoreRepository.class);
        when(repository.find("sessions", "session-a")).thenReturn(Map.of("studentId", "student-a"));
        MockHttpServletRequest request = request("student-b", "STUDENT");

        ApiException error = assertThrows(ApiException.class,
                () -> new SessionController(repository).session("session-a", request));

        assertEquals(HttpStatus.FORBIDDEN, error.status());
    }

    @Test
    void comingSoonExperimentCannotStart() {
        FirestoreRepository repository = mock(FirestoreRepository.class);
        when(repository.find("experiments", "udp-client-server"))
                .thenReturn(Map.of("status", "COMING_SOON", "experimentType", "udp-client-server"));

        ApiException error = assertThrows(ApiException.class,
                () -> new SessionController(repository).start(new SessionController.StartRequest("udp-client-server"),
                        request("student-a", "STUDENT")));

        assertEquals(HttpStatus.CONFLICT, error.status());
    }

    @Test
    void submittingOwnedRunningSessionPersistsTranscriptAndCompletesSession() {
        FirestoreRepository repository = mock(FirestoreRepository.class);
        when(repository.find("sessions", "session-a")).thenReturn(Map.of(
                "studentId", "student-a", "status", "RUNNING", "experimentId", "tcp-client-server",
                "logs", List.of(Map.of("direction", "SERVER", "text", "PONG", "at", "2026-09-30T00:00:00Z"))));
        when(repository.find("submissions", "session-a")).thenReturn(null);
        SessionController.SubmissionRequest input = new SessionController.SubmissionRequest("Received PONG");

        Map<String, Object> result = new SessionController(repository).submit("session-a", input, request("student-a", "STUDENT"));

        assertEquals("SUBMITTED", result.get("status"));
        assertEquals("student-a", result.get("studentId"));
        assertEquals("PONG", ((Map<?, ?>) ((List<?>) result.get("logs")).get(0)).get("text"));
        verify(repository).create(eq("submissions"), eq("session-a"), any());
        verify(repository).update(eq("sessions"), eq("session-a"), any());
    }

    @Test
    void duplicateSubmissionIsRejected() {
        FirestoreRepository repository = mock(FirestoreRepository.class);
        when(repository.find("sessions", "session-a")).thenReturn(Map.of(
                "studentId", "student-a", "status", "RUNNING", "experimentId", "tcp-client-server"));
        when(repository.find("submissions", "session-a")).thenReturn(Map.of("id", "session-a"));
        SessionController.SubmissionRequest input = new SessionController.SubmissionRequest("Received PONG");

        ApiException error = assertThrows(ApiException.class,
                () -> new SessionController(repository).submit("session-a", input, request("student-a", "STUDENT")));

        assertEquals(HttpStatus.CONFLICT, error.status());
    }

    @Test
    void sessionWithoutServerRecordedResponseCannotBeSubmitted() {
        FirestoreRepository repository = mock(FirestoreRepository.class);
        when(repository.find("sessions", "session-a")).thenReturn(Map.of(
                "studentId", "student-a", "status", "RUNNING", "experimentId", "tcp-client-server",
                "logs", List.of(Map.of("direction", "STUDENT", "text", "ping"))));
        when(repository.find("submissions", "session-a")).thenReturn(null);

        ApiException error = assertThrows(ApiException.class,
                () -> new SessionController(repository).submit("session-a",
                        new SessionController.SubmissionRequest("PONG"), request("student-a", "STUDENT")));

        assertEquals(HttpStatus.CONFLICT, error.status());
    }

    private MockHttpServletRequest request(String uid, String role) {
        FirebaseToken token = mock(FirebaseToken.class);
        when(token.getUid()).thenReturn(uid);
        DocumentSnapshot profile = mock(DocumentSnapshot.class);
        when(profile.getString("role")).thenReturn(role);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setAttribute("firebaseToken", token);
        request.setAttribute("profile", profile);
        return request;
    }
}
