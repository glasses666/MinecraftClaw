package io.openclaw.minecraftclaw.client;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import org.junit.jupiter.api.Test;

class DesignDaemonExecutableResolverTest {
	@Test
	void resolvesExecutableFromExplicitPathEntries() throws Exception {
		Path binDirectory = Files.createTempDirectory("minecraftclaw-bin");
		Path executable = Files.createFile(binDirectory.resolve("node"));
		executable.toFile().setExecutable(true);

		Path resolved = DesignDaemonExecutableResolver.resolve(
			"node",
			Map.of("PATH", binDirectory.toString()),
			java.util.List.of()
		);

		assertEquals(executable.toAbsolutePath().normalize(), resolved);
	}

	@Test
	void fallsBackToKnownHomebrewLocationWhenPathDoesNotContainNode() {
		Path resolved = DesignDaemonExecutableResolver.resolve(
			"node",
			Map.of("PATH", "/usr/bin"),
			java.util.List.of(Path.of("/opt/homebrew/bin/node"))
		);

		assertEquals(Path.of("/opt/homebrew/bin/node"), resolved);
	}

	@Test
	void returnsNullWhenExecutableCannotBeFound() {
		Path resolved = DesignDaemonExecutableResolver.resolve(
			"node",
			Map.of("PATH", "/usr/bin"),
			java.util.List.of(Path.of("/path/that/does/not/exist/node"))
		);

		assertTrue(resolved == null);
	}
}
