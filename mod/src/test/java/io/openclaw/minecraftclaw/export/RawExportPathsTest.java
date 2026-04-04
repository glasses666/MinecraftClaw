package io.openclaw.minecraftclaw.export;

import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

final class RawExportPathsTest {
	@Test
	void createBuildsAStableExportDirectoryAndKnownFiles() {
		RawExportPaths paths = RawExportPaths.create(
			Path.of("/tmp/mcclaw"),
			"Queen Glasser",
			Instant.parse("2026-04-04T09:05:06Z"),
			RawExportProfile.defaultProfile()
		);

		assertEquals(
			Path.of("/tmp/mcclaw", "minecraftclaw", "exports", "20260404T090506Z-queen-glasser"),
			paths.exportDirectory()
		);
		assertEquals(
			List.of(
				Path.of("/tmp/mcclaw", "minecraftclaw", "exports", "20260404T090506Z-queen-glasser", "scan_meta.json"),
				Path.of("/tmp/mcclaw", "minecraftclaw", "exports", "20260404T090506Z-queen-glasser", "player_state.json"),
				Path.of("/tmp/mcclaw", "minecraftclaw", "exports", "20260404T090506Z-queen-glasser", "inventory.json"),
				Path.of("/tmp/mcclaw", "minecraftclaw", "exports", "20260404T090506Z-queen-glasser", "local_blocks.json"),
				Path.of("/tmp/mcclaw", "minecraftclaw", "exports", "20260404T090506Z-queen-glasser", "block_entities.json"),
				Path.of("/tmp/mcclaw", "minecraftclaw", "exports", "20260404T090506Z-queen-glasser", "entities.json"),
				Path.of("/tmp/mcclaw", "minecraftclaw", "exports", "20260404T090506Z-queen-glasser", "surface_map.json")
			),
			paths.files()
		);
	}
}
