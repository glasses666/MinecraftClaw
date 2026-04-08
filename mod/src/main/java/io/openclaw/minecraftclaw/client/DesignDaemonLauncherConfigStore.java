package io.openclaw.minecraftclaw.client;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.IOException;
import java.io.Reader;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

public final class DesignDaemonLauncherConfigStore {
	private final Path stateFile;

	public DesignDaemonLauncherConfigStore(Path rootDirectory) {
		this.stateFile = rootDirectory.resolve("design-daemon-launcher.json");
	}

	public Path stateFile() {
		return stateFile;
	}

	public Optional<DesignDaemonLauncherConfig> load() throws IOException {
		if (!Files.exists(stateFile)) {
			return Optional.empty();
		}

		try (Reader reader = Files.newBufferedReader(stateFile, StandardCharsets.UTF_8)) {
			JsonObject root = JsonParser.parseReader(reader).getAsJsonObject();
			String mcpServerDir = root.has("mcpServerDir") && !root.get("mcpServerDir").isJsonNull()
				? root.get("mcpServerDir").getAsString()
				: "";
			return Optional.of(new DesignDaemonLauncherConfig(mcpServerDir));
		}
	}

	public void writeTemplateIfMissing() throws IOException {
		if (Files.exists(stateFile)) {
			return;
		}

		Files.createDirectories(stateFile.getParent());
		try (Writer writer = Files.newBufferedWriter(stateFile, StandardCharsets.UTF_8)) {
			writer.write("""
				{
				  "mcpServerDir": "/absolute/path/to/your/mcp-server"
				}
				""");
		}
	}
}
