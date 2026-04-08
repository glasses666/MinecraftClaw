package io.openclaw.minecraftclaw.client;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import org.junit.jupiter.api.Test;

class DesignPreviewSessionTest {
	@Test
	void defaultsToFirstCandidateAndAllowsExplicitCandidateSelection() {
		DesignPreviewSession session = DesignPreviewSession.ready(
			"snap_test_01",
			"profile-local",
			"Local OpenAI",
			"gpt-4.1-mini",
			List.of(
				new DesignCandidatePayload("candidate-1", "Northlight Cabin", "desc", List.of(), null, null, List.of(), null),
				new DesignCandidatePayload("candidate-2", "Terrace Loft", "desc", List.of(), null, null, List.of(), null),
				new DesignCandidatePayload("candidate-3", "Stone Nook", "desc", List.of(), null, null, List.of(), null)
			)
		);

		assertEquals(0, session.activeCandidateIndex());

		session.selectCandidate(2);

		assertEquals(2, session.activeCandidateIndex());
		assertEquals("candidate-3", session.activeCandidate().orElseThrow().candidateId());
	}
}
