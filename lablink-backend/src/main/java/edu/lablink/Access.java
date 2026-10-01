package edu.lablink;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;

public final class Access {
    private Access() {}
    public static UserEntity user() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserEntity user))
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Please log in");
        return user;
    }
    public static void role(String... roles) {
        String role = user().getRole();
        for (String allowed : roles) if (allowed.equals(role)) return;
        throw new ApiException(HttpStatus.FORBIDDEN, "This action is not available to your role");
    }
    public static void owner(UserEntity student) {
        if ("STUDENT".equals(user().getRole()) && !student.getId().equals(user().getId()))
            throw new ApiException(HttpStatus.FORBIDDEN, "You can only access your own work");
    }
}
