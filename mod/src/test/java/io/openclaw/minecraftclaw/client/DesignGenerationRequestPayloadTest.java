package io.openclaw.minecraftclaw.client;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class DesignGenerationRequestPayloadTest {
	@Test
	void includesVisionCapabilityFromSelectedModelProfile() {
		ModelProfile profile = new ModelProfile(
			"profile-1",
			"Vision profile",
			ProviderType.OPENAI_COMPATIBLE,
			"http://127.0.0.1:11434/v1",
			"",
			"gemma3:27b",
			true,
			true
		);

		DesignGenerationRequestPayload payload = DesignGenerationRequestPayload.from(profile, "/tmp/snapshot", "snap-1");

		assertEquals("profile-1", payload.providerProfileId());
		assertEquals("openai-compatible", payload.providerType());
		assertTrue(payload.supportsVision());
	}
}
