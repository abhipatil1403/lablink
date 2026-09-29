package edu.lablink;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final Firestore firestore;

    public UserController(Firestore firestore) {
        this.firestore = firestore;
    }

    record Registration(@NotBlank @Size(max = 100) String name) {}

    @PostMapping("/register")
    public Map<String, Object> register(@Valid @RequestBody Registration input, HttpServletRequest request) throws Exception {
        FirebaseToken token = (FirebaseToken) request.getAttribute("firebaseToken");
        DocumentSnapshot existing = (DocumentSnapshot) request.getAttribute("profile");
        if (existing.exists()) {
            throw new ApiException(HttpStatus.CONFLICT, "User profile already exists");
        }
        if (token.getEmail() == null || token.getEmail().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "An email account is required");
        }
        Map<String, Object> profile = new HashMap<>();
        profile.put("uid", token.getUid());
        profile.put("name", input.name().trim());
        profile.put("email", token.getEmail());
        profile.put("role", "STUDENT");
        profile.put("status", "ACTIVE");
        profile.put("createdAt", Instant.now().toString());
        firestore.collection("users").document(token.getUid()).create(profile).get(5, TimeUnit.SECONDS);
        return profile;
    }

    @GetMapping("/me")
    public Map<String, Object> me(HttpServletRequest request) {
        DocumentSnapshot profile = (DocumentSnapshot) request.getAttribute("profile");
        return profile.getData();
    }
}
