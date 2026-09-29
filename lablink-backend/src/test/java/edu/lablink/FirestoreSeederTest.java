package edu.lablink;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Map;
import org.junit.jupiter.api.Test;

class FirestoreSeederTest {
    @Test
    void catalogContainsOneActiveTcpExperimentAndSixUniqueIds() {
        var experiments = ExperimentSeeds.experiments();
        assertEquals(6, experiments.size());
        assertEquals(6, experiments.stream().map(item -> item.get("id")).distinct().count());
        assertEquals(1, experiments.stream().filter(item -> "ACTIVE".equals(item.get("status"))).count());
        assertEquals("TCP", experiments.get(0).get("protocol"));
        assertTrue(experiments.stream().skip(1).allMatch(item -> "COMING_SOON".equals(item.get("status"))));
    }

    @Test
    void existingDocumentsAreNeverOverwritten() {
        FirestoreRepository repository = mock(FirestoreRepository.class);
        when(repository.find(anyString(), anyString())).thenReturn(Map.of("id", "existing"));

        new FirestoreSeeder(repository, "127.0.0.1", 9001).seed();

        verify(repository, never()).create(anyString(), anyString(), any());
    }
}
