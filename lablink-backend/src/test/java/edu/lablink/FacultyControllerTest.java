package edu.lablink;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.firebase.auth.FirebaseToken;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;

class FacultyControllerTest {
    @Test
    void studentCannotUseFacultyDashboard() {
        FacultyController controller = new FacultyController(mock(FirestoreRepository.class));
        ApiException error = assertThrows(ApiException.class, () -> controller.dashboard(request("STUDENT")));
        assertEquals(HttpStatus.FORBIDDEN, error.status());
    }

    @Test
    void reviewPersistsGradeFeedbackAndStatus() {
        FirestoreRepository repository = mock(FirestoreRepository.class);
        when(repository.find("submissions", "submission-a")).thenReturn(Map.of(
                "id", "submission-a", "studentId", "student-a", "experimentId", "tcp-client-server", "status", "SUBMITTED"));
        FacultyController controller = new FacultyController(repository);

        Map<String, Object> result = controller.review("submission-a", new FacultyController.ReviewInput(82, "Good analysis"), request("FACULTY"));

        assertEquals("REVIEWED", result.get("status"));
        assertEquals(82, result.get("grade"));
        verify(repository).update(eq("submissions"), eq("submission-a"), any());
    }

    private MockHttpServletRequest request(String role) {
        FirebaseToken token = mock(FirebaseToken.class);
        when(token.getUid()).thenReturn("faculty-a");
        DocumentSnapshot profile = mock(DocumentSnapshot.class);
        when(profile.getString("role")).thenReturn(role);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setAttribute("firebaseToken", token);
        request.setAttribute("profile", profile);
        return request;
    }
}
