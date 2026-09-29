package edu.lablink;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Arrays;
import org.springframework.http.HttpStatus;

public final class Access {
    private Access() {}

    public static String uid(HttpServletRequest request) {
        return ((FirebaseToken) request.getAttribute("firebaseToken")).getUid();
    }

    public static String role(HttpServletRequest request) {
        return ((DocumentSnapshot) request.getAttribute("profile")).getString("role");
    }

    public static void requireRole(HttpServletRequest request, String... roles) {
        if (Arrays.stream(roles).noneMatch(role -> role.equals(role(request)))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You do not have permission for this action");
        }
    }

    public static void requireOwner(HttpServletRequest request, String ownerId) {
        if (!uid(request).equals(ownerId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You do not have permission for this session");
        }
    }
}
