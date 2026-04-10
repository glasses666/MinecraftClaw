package io.openclaw.minecraftclaw.client;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class DesignDaemonCommandEnvironmentTest {
	@Test
	void prependsExecutableParentToPath() {
		Map<String, String> environment = new LinkedHashMap<>();
		environment.put("PATH", "/usr/bin:/bin");

		DesignDaemonCommandEnvironment.prependExecutableDirectory(environment, Path.of("/opt/homebrew/bin/npm"));

		assertEquals("/opt/homebrew/bin:/usr/bin:/bin", environment.get("PATH"));
	}

	@Test
	void avoidsDuplicatingExistingPathEntry() {
		Map<String, String> environment = new LinkedHashMap<>();
		environment.put("PATH", "/opt/homebrew/bin:/usr/bin:/bin");

		DesignDaemonCommandEnvironment.prependExecutableDirectory(environment, Path.of("/opt/homebrew/bin/npm"));

		assertEquals("/opt/homebrew/bin:/usr/bin:/bin", environment.get("PATH"));
	}

	@Test
	void createsPathWhenMissing() {
		Map<String, String> environment = new LinkedHashMap<>();

		DesignDaemonCommandEnvironment.prependExecutableDirectory(environment, Path.of("/opt/homebrew/bin/node"));

		assertTrue(environment.get("PATH").startsWith("/opt/homebrew/bin"));
	}
}
