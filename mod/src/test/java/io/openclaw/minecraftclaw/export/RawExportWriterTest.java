package io.openclaw.minecraftclaw.export;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

final class RawExportWriterTest {
	@Test
	void writeCreatesTheExpectedJsonFiles(@TempDir Path tempDir) throws IOException {
		RawExportSnapshot snapshot = new RawExportSnapshot(
			Map.of("schema_version", 1, "scanned_at", "2026-04-04T09:05:06Z"),
			Map.of("player_name", "Queen Glasser", "dimension", "minecraft:overworld"),
			List.of(Map.of("slot", 0, "item_id", "minecraft:stone", "count", 32)),
			List.of(Map.of("x", 1, "y", 64, "z", 2, "block_id", "minecraft:grass_block")),
			List.of(Map.of("x", 1, "y", 64, "z", 3, "type", "minecraft:chest", "nbt_snbt", "{id:\"minecraft:chest\"}")),
			List.of(Map.of("uuid", "00000000-0000-0000-0000-000000000001", "type", "minecraft:cow")),
			List.of(Map.of("x", 0, "z", 0, "surface_y", 64, "block_id", "minecraft:grass_block"))
		);

		RawExportPaths paths = RawExportWriter.write(
			tempDir,
			"Queen Glasser",
			Instant.parse("2026-04-04T09:05:06Z"),
			RawExportProfile.defaultProfile(),
			snapshot
		);

		assertTrue(Files.isDirectory(paths.exportDirectory()));
		assertEquals(7, paths.files().size());
		for (Path file : paths.files()) {
			assertTrue(Files.exists(file), "Expected export file to exist: " + file);
		}

		JsonObject playerState = JsonParser.parseString(Files.readString(paths.exportDirectory().resolve("player_state.json"))).getAsJsonObject();
		assertEquals("Queen Glasser", playerState.get("player_name").getAsString());

		JsonObject scanMeta = JsonParser.parseString(Files.readString(paths.exportDirectory().resolve("scan_meta.json"))).getAsJsonObject();
		assertEquals(1, scanMeta.get("schema_version").getAsInt());
	}
}
