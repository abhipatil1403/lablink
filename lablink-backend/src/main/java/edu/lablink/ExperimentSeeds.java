package edu.lablink;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public final class ExperimentSeeds {
    private ExperimentSeeds() {}

    public static List<Map<String, Object>> experiments() {
        return List.of(
                experiment("tcp-client-server", "TCP Client-Server Communication", "TCP", "EASY", "ACTIVE",
                        "Learn connection-oriented communication using live sockets.",
                        "Establish a TCP connection and exchange command and response data with a server.",
                        List.of("Start the experiment and wait for CONNECTED.", "Send ping, time, help, and echo commands.", "Observe responses and submit the session."),
                        "PONG, a server timestamp, available commands, and echoed text.",
                        List.of("TCP", "client-server", "socket", "IP address", "port", "reliability"), "TCP server on 127.0.0.1:9001"),
                experiment("udp-client-server", "UDP Client-Server Communication", "UDP", "EASY", "COMING_SOON",
                        "Explore connectionless datagrams.", "Exchange UDP datagrams and compare delivery with TCP.",
                        List.of("This experiment is not available yet."), "Datagram reply from a UDP server.",
                        List.of("UDP", "datagram", "port"), "UDP experiment server"),
                experiment("dns-lookup", "DNS Lookup", "DNS", "MEDIUM", "COMING_SOON",
                        "Resolve a domain name into an IP address.", "Inspect DNS name resolution and records.",
                        List.of("This experiment is not available yet."), "Resolved record values and DNS response details.",
                        List.of("DNS", "name resolution", "IP address"), "DNS resolver"),
                experiment("http-request", "HTTP Request/Response", "HTTP", "MEDIUM", "COMING_SOON",
                        "Inspect an HTTP exchange.", "Send a request and examine its status, headers, and body.",
                        List.of("This experiment is not available yet."), "HTTP status, headers, and response body.",
                        List.of("HTTP", "request", "response"), "HTTP server"),
                experiment("network-availability", "Ping / Network Availability", "ICMP", "MEDIUM", "COMING_SOON",
                        "Understand host reachability.", "Measure whether an approved host can be reached.",
                        List.of("This experiment is not available yet."), "Reachability and response time.",
                        List.of("ICMP", "latency", "reachability"), "Approved availability probe"),
                experiment("tcp-file-transfer", "TCP File Transfer", "TCP", "HARD", "COMING_SOON",
                        "Transfer a file reliably over TCP.", "Observe framing and integrity during a TCP file transfer.",
                        List.of("This experiment is not available yet."), "Transfer details and verified checksum.",
                        List.of("TCP", "stream", "framing", "integrity"), "TCP file server")
        );
    }

    private static Map<String, Object> experiment(String id, String title, String protocol, String difficulty,
            String status, String description, String objective, List<String> instructions, String expectedOutput,
            List<String> concepts, String serverRequirement) {
        Map<String, Object> data = new HashMap<>();
        data.put("id", id);
        data.put("title", title);
        data.put("protocol", protocol);
        data.put("difficulty", difficulty);
        data.put("status", status);
        data.put("description", description);
        data.put("objective", objective);
        data.put("instructions", instructions);
        data.put("expectedOutput", expectedOutput);
        data.put("networkingConcepts", concepts);
        data.put("serverRequirement", serverRequirement);
        data.put("experimentType", id);
        data.put("createdAt", Instant.now().toString());
        data.put("updatedAt", Instant.now().toString());
        return data;
    }
}
