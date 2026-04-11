package io.openclaw.minecraftclaw.client;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;

class ModelProfileStoreTest {
	@Test
	void loadsEmptyConfigWhenProfileFileDoesNotExist() throws Exception {
		Path root = Files.createTempDirectory("minecraftclaw-model-profiles");
		ModelProfileStore store = new ModelProfileStore(root);

		ModelProfileConfig config = store.load();

		assertTrue(config.profiles().isEmpty());
		assertEquals(null, config.lastUsedProfileId());
	}

	@Test
	void savesProfilesAndLastUsedProfileId() throws Exception {
		Path root = Files.createTempDirectory("minecraftclaw-model-profiles");
		ModelProfileStore store = new ModelProfileStore(root);
		ModelProfileConfig config = new ModelProfileConfig(
			1,
			List.of(
				new ModelProfile(
					"profile-local-openai",
					"Local OpenAI",
					ProviderType.OPENAI_COMPATIBLE,
					"http://127.0.0.1:11434/v1",
					"secret-key",
					"gpt-4.1-mini",
					true,
					true
				)
			),
			"profile-local-openai"
		);

		store.save(config);
		ModelProfileConfig reloaded = store.load();

		assertEquals(1, reloaded.version());
		assertEquals("profile-local-openai", reloaded.lastUsedProfileId());
		assertEquals(1, reloaded.profiles().size());
		assertEquals("Local OpenAI", reloaded.profiles().get(0).label());
		assertEquals(ProviderType.OPENAI_COMPATIBLE, reloaded.profiles().get(0).providerType());
		assertTrue(reloaded.profiles().get(0).supportsVision());
	}

	@Test
	void defaultsSupportsVisionToFalseWhenLoadingLegacyProfileJson() throws Exception {
		Path root = Files.createTempDirectory("minecraftclaw-model-profiles");
		Path stateFile = root.resolve("model-profiles.json");
		Files.writeString(
			stateFile,
			"""
			{
			  "version": 1,
			  "lastUsedProfileId": "legacy-profile",
			  "profiles": [
			    {
			      "id": "legacy-profile",
			      "label": "Legacy",
			      "providerType": "openai-compatible",
			      "baseUrl": "http://127.0.0.1:11434/v1",
			      "apiKey": "",
			      "model": "legacy-model",
			      "enabled": true
			    }
			  ]
			}
			""",
			StandardCharsets.UTF_8
		);

		ModelProfileConfig config = new ModelProfileStore(root).load();

		assertEquals(1, config.profiles().size());
		assertFalse(config.profiles().get(0).supportsVision());
	}
}
