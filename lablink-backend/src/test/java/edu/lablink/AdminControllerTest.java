package edu.lablink;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;

class AdminControllerTest {
    private final AdminController controller = new AdminController(mock(FirestoreRepository.class),
            mock(FirebaseAuth.class), "http://localhost:3001", "127.0.0.1", 9001);

    @Test
    void facultyCannotAccessAdminDashboard() {
        ApiException error = assertThrows(ApiException.class, () -> controller.dashboard(request("FACULTY")));
        assertEquals(HttpStatus.FORBIDDEN, error.status());
    }

    @Test
    void adminCannotDemoteOrDisableOwnAccount() {
        ApiException demotion = assertThrows(ApiException.class,
                () -> controller.userRole("admin-a", new AdminController.RoleInput("STUDENT"), request("ADMIN")));
        ApiException disable = assertThrows(ApiException.class,
                () -> controller.userStatus("admin-a", new AdminController.StatusInput("DISABLED"), request("ADMIN")));
        assertEquals(HttpStatus.CONFLICT, demotion.status());
        assertEquals(HttpStatus.CONFLICT, disable.status());
    }

    private MockHttpServletRequest request(String role) {
        FirebaseToken token = mock(FirebaseToken.class);
        when(token.getUid()).thenReturn("admin-a");
        DocumentSnapshot profile = mock(DocumentSnapshot.class);
        when(profile.getString("role")).thenReturn(role);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setAttribute("firebaseToken", token);
        request.setAttribute("profile", profile);
        return request;
    }
}
