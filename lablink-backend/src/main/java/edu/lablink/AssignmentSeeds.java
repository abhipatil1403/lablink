package edu.lablink;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public final class AssignmentSeeds {
    private AssignmentSeeds() {}

    public static List<Map<String, Object>> assignments() {
        return List.of(
                assignment("tcp-chat-client", "TCP Chat Client", "TCP", "MEDIUM", "ACTIVE", "tcp-chat",
                        "Build a messaging client that connects, identifies a user, exchanges messages, and disconnects gracefully.",
                        List.of("Connect to the LabLink messaging server.", "Send a username before messages.", "Send and receive multiple messages.", "Handle disconnection and close gracefully."),
                        List.of("TCP", "Sockets", "Client-server architecture", "IP address", "Port numbers", "Error handling"), "TCP chat server on port 9001"),
                assignment("reliable-file-transfer", "Reliable File Transfer", "TCP", "HARD", "COMING_SOON", "file-transfer",
                        "Build a client that requests, receives, reconstructs, and verifies a controlled file.",
                        List.of("Request a specified file.", "Buffer incoming stream data.", "Save and verify the reconstructed file.", "Handle invalid requests and interrupted transfers."),
                        List.of("TCP", "Streams", "Buffering", "Reliable transfer", "Integrity"), "Controlled file-transfer server"),
                assignment("udp-multiplayer-telemetry", "UDP Multiplayer Position & Telemetry System", "UDP", "HARD", "COMING_SOON", "udp-telemetry",
                        "Build a client that sends position datagrams and processes updates from other clients.",
                        List.of("Send x,y position packets.", "Receive and process broadcasts.", "Handle invalid and out-of-order datagrams."),
                        List.of("UDP", "Datagrams", "Real-time communication", "Packet loss"), "UDP telemetry server"),
                assignment("student-information-api", "College Student Information API Client", "HTTP", "MEDIUM", "COMING_SOON", "http-api",
                        "Build an HTTP client that retrieves and displays required student information.",
                        List.of("Call the controlled endpoint with the correct method.", "Parse JSON fields.", "Handle HTTP failures."),
                        List.of("HTTP", "REST", "Status codes", "Headers", "JSON"), "Controlled student-information API"),
                assignment("dns-troubleshooting", "DNS Troubleshooting Challenge", "DNS", "HARD", "COMING_SOON", "dns-challenge",
                        "Investigate why portal.lablink.edu does not open and submit evidence, root cause, and a solution.",
                        List.of("Query controlled DNS records.", "Record observations.", "Diagnose the configuration issue and submit a remedy."),
                        List.of("DNS", "Records", "Name resolution", "Network troubleshooting"), "DNS challenge service"),
                assignment("network-monitoring", "Network Monitoring System", "NETWORK", "HARD", "COMING_SOON", "network-monitoring",
                        "Build a monitoring tool that checks configured servers and reports availability and latency.",
                        List.of("Read configured servers.", "Measure responses and timeouts.", "Display useful monitoring results."),
                        List.of("Availability", "Latency", "Timeout", "Network troubleshooting"), "Controlled monitoring endpoints"),
                assignment("client-server-file-search", "Client-Server File Search", "TCP", "HARD", "COMING_SOON", "file-search",
                        "Build a client that searches a document server and downloads a selected result.",
                        List.of("Send a search request.", "Display matching files.", "Download a selected file and handle errors."),
                        List.of("TCP", "Client-server", "Request-response", "File transfer"), "Controlled document-search server"));
    }

    private static Map<String, Object> assignment(String id, String title, String protocol, String difficulty, String status,
            String assignmentType, String description, List<String> requirements, List<String> concepts, String serverRequirement) {
        Map<String, Object> data = new HashMap<>();
        data.put("id", id); data.put("title", title); data.put("protocol", protocol); data.put("difficulty", difficulty);
        data.put("status", status); data.put("assignmentType", assignmentType); data.put("description", description);
        data.put("objective", description); data.put("requirements", requirements); data.put("instructions", requirements);
        data.put("constraints", List.of("Use the controlled LabLink environment.", "Handle failures safely.", "Submit evidence from a real execution."));
        data.put("expectedBehavior", "Automated evaluation records real network activity and assignment-specific checks.");
        data.put("networkingConcepts", concepts); data.put("serverRequirement", serverRequirement);
        data.put("createdAt", Instant.now().toString()); data.put("updatedAt", Instant.now().toString()); return data;
    }
}
