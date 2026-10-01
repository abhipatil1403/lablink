package edu.lablink;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(exclude = org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration.class)
@org.springframework.scheduling.annotation.EnableScheduling
public class LabLinkApplication {
    public static void main(String[] args) {
        SpringApplication.run(LabLinkApplication.class, args);
    }
}
