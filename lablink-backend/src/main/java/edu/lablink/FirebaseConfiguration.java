package edu.lablink;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.cloud.FirestoreClient;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FirebaseConfiguration {
    @Bean
    FirebaseApp firebaseApp(@Value("${lablink.firebase-project-id}") String projectId,
            @Value("${FIREBASE_SERVICE_ACCOUNT_JSON:}") String serviceAccountJson,
            @Value("${GOOGLE_APPLICATION_CREDENTIALS:}") String credentialsPath) throws IOException {
        if (projectId.isBlank()) {
            throw new IllegalStateException("Set FIREBASE_PROJECT_ID before starting LabLink API");
        }
        if (!FirebaseApp.getApps().isEmpty()) {
            return FirebaseApp.getInstance();
        }
        GoogleCredentials credentials = credentials(serviceAccountJson, credentialsPath);
        FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(credentials)
                .setProjectId(projectId)
                .build();
        return FirebaseApp.initializeApp(options);
    }

    private GoogleCredentials credentials(String serviceAccountJson, String credentialsPath) throws IOException {
        if (!serviceAccountJson.isBlank()) {
            return GoogleCredentials.fromStream(new ByteArrayInputStream(serviceAccountJson.getBytes(StandardCharsets.UTF_8)));
        }
        if (!credentialsPath.isBlank()) {
            try (var input = Files.newInputStream(Path.of(credentialsPath))) {
                return GoogleCredentials.fromStream(input);
            }
        }
        return GoogleCredentials.getApplicationDefault();
    }

    @Bean
    FirebaseAuth firebaseAuth(FirebaseApp app) {
        return FirebaseAuth.getInstance(app);
    }

    @Bean
    Firestore firestore(FirebaseApp app) {
        return FirestoreClient.getFirestore(app);
    }
}
