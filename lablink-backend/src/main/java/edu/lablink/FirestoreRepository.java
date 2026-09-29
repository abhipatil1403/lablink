package edu.lablink;

import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Repository;

@Repository
public class FirestoreRepository {
    private final Firestore db;

    public FirestoreRepository(Firestore db) {
        this.db = db;
    }

    public DocumentSnapshot document(String collection, String id) {
        try {
            return ref(collection, id).get().get(5, TimeUnit.SECONDS);
        } catch (Exception error) {
            throw unavailable(error);
        }
    }

    public Map<String, Object> find(String collection, String id) {
        DocumentSnapshot snapshot = document(collection, id);
        return snapshot.exists() ? snapshot.getData() : null;
    }

    public List<Map<String, Object>> all(String collection) {
        try {
            return db.collection(collection).get().get(5, TimeUnit.SECONDS).getDocuments()
                    .stream().map(QueryDocumentSnapshot::getData).collect(Collectors.toList());
        } catch (Exception error) {
            throw unavailable(error);
        }
    }

    public void create(String collection, String id, Map<String, Object> data) {
        try {
            ref(collection, id).create(data).get(5, TimeUnit.SECONDS);
        } catch (Exception error) {
            throw unavailable(error);
        }
    }

    public void update(String collection, String id, Map<String, Object> fields) {
        try {
            ref(collection, id).update(fields).get(5, TimeUnit.SECONDS);
        } catch (Exception error) {
            throw unavailable(error);
        }
    }

    private DocumentReference ref(String collection, String id) {
        return db.collection(collection).document(id);
    }

    private ApiException unavailable(Exception error) {
        if (error instanceof InterruptedException) Thread.currentThread().interrupt();
        return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Unable to connect to LabLink services");
    }
}
