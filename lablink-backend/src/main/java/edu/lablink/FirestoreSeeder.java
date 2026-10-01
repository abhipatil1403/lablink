package edu.lablink;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class FirestoreSeeder {
    private final FirestoreRepository repository;
    private final String tcpHost;
    private final int tcpPort;

    public FirestoreSeeder(FirestoreRepository repository,
            @Value("${lablink.tcp-host}") String tcpHost, @Value("${lablink.tcp-port}") int tcpPort) {
        this.repository = repository;
        this.tcpHost = tcpHost;
        this.tcpPort = tcpPort;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void seed() {
        for (Map<String, Object> assignment : AssignmentSeeds.assignments()) {
            String id = (String) assignment.get("id");
            if (repository.find("assignments", id) == null) repository.create("assignments", id, assignment);
        }
        for (Map<String, Object> experiment : ExperimentSeeds.experiments()) {
            String id = (String) experiment.get("id");
            if (repository.find("experiments", id) == null) repository.create("experiments", id, experiment);
        }
        if (repository.find("experimentServers", "tcp-local") == null) {
            Map<String, Object> server = new HashMap<>();
            server.put("id", "tcp-local");
            server.put("name", "TCP Experiment Server");
            server.put("address", tcpHost);
            server.put("port", tcpPort);
            server.put("supportedProtocols", List.of("TCP"));
            server.put("status", "UNKNOWN");
            server.put("lastHeartbeat", null);
            server.put("createdAt", Instant.now().toString());
            repository.create("experimentServers", "tcp-local", server);
        }
    }
}
