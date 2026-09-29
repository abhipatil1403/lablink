package edu.lablink;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.firebase.auth.FirebaseToken;
import java.util.Map;
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
