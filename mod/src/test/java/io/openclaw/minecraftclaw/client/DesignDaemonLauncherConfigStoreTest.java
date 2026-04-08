package io.openclaw.minecraftclaw.client;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class DesignDaemonLauncherConfigStoreTest {
	@Test
	void writesTemplateWhenLauncherConfigIsMissing() throws Exception {
		Path root = Files.createTempDirectory("minecraftclaw-daemon-launcher-config");
		DesignDaemonLauncherConfigStore store = new DesignDaemonLauncherConfigStore(root);

		store.writeTemplateIfMissing();

		Path configFile = root.resolve("design-daemon-launcher.json");
		assertTrue(Files.exists(configFile));
		assertTrue(Files.readString(configFile).contains("\"mcpServerDir\""));
	}

	@Test
	void loadsConfiguredMcpServerDirectory() throws Exception {
		Path root = Files.createTempDirectory("minecraftclaw-daemon-launcher-config");
		DesignDaemonLauncherConfigStore store = new DesignDaemonLauncherConfigStore(root);
		Files.writeString(
			root.resolve("design-daemon-launcher.json"),
			"""
			{
			  "mcpServerDir": "/tmp/mcp-server"
			}
			"""
		);

		DesignDaemonLauncherConfig config = store.load().orElseThrow();

		assertEquals("/tmp/mcp-server", config.mcpServerDir());
	}
}
