package edu.lablink;

import jakarta.persistence.*;
import java.time.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AttemptRecovery {
    @PersistenceContext private EntityManager em;
    /** Recover attempts left running by a crashed/redeployed gateway. Maximum run is 20 bounded tests. */
    @Scheduled(fixedDelay = 60000, initialDelay = 60000) @Transactional
    public void recover() {
        Instant now = Instant.now();
        em.createQuery("update AssignmentAttempt a set a.status = 'FAILED', a.executionLog = :message, a.endedAt = :now " +
            "where a.status = 'RUNNING' and a.executionStartedAt < :cutoff")
            .setParameter("message", "Execution lease expired. Reconnect and run your solution again.")
            .setParameter("now", now).setParameter("cutoff", now.minus(Duration.ofMinutes(10))).executeUpdate();
        em.createQuery("update NetworkSession s set s.status = 'FAILED', s.endedAt = :now " +
            "where s.status = 'RUNNING' and s.attempt.status = 'FAILED'")
            .setParameter("now", now).executeUpdate();
    }
}
