package io.openclaw.minecraftclaw.snapshot;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import io.openclaw.minecraftclaw.selection.SelectionVolume;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import net.minecraft.util.math.BlockPos;
import org.junit.jupiter.api.Test;

class DesignSnapshotWriterTest {
	@Test
	void writesRequestAndReferencedContextFiles() throws Exception {
		Path root = Files.createTempDirectory("minecraftclaw-design-snapshot");
		DesignSnapshot snapshot = new DesignSnapshot(
			"snap_test_01",
			SelectionVolume.between(new BlockPos(100, 64, 200), new BlockPos(111, 73, 211)),
			new DesignPromptContext("cozy cliff hut", "warm", "no second floor", 3),
			new DesignSpaceContext(
				List.of(new DesignSlice(0, List.of("S1 S1", "S1 N1"))),
				java.util.Map.of("S1", new PaletteLegendEntry("S1", "stone", List.of("minecraft:stone")))
			),
			new EnvironmentViews(List.of(new EnvironmentView("north", "open water", "environment-north.png"))),
			new PlayerDesignContext("survival", List.of(new InventoryCount("minecraft:stone", 64))),
			new GameDesignContext("1.20.1", List.of(new ModInfo("minecraft", "1.20.1"))),
			new PaletteCatalog(List.of(new PaletteCatalogEntry("S1", "minecraft:stone", "stone_like")))
		);

		DesignSnapshotPaths paths = DesignSnapshotWriter.write(root, snapshot);

		assertTrue(Files.isDirectory(paths.snapshotDirectory()));
		assertTrue(Files.exists(paths.requestFile()));
		assertTrue(Files.exists(paths.spaceContextFile()));
		assertTrue(Files.exists(paths.environmentViewsFile()));
		assertTrue(Files.exists(paths.playerContextFile()));
		assertTrue(Files.exists(paths.gameContextFile()));
		assertTrue(Files.exists(paths.paletteCatalogFile()));

		JsonObject request = JsonParser.parseString(Files.readString(paths.requestFile())).getAsJsonObject();
		JsonObject environmentViews = JsonParser.parseString(Files.readString(paths.environmentViewsFile())).getAsJsonObject();
		assertEquals("snap_test_01", request.get("snapshotId").getAsString());
		assertEquals("space-context.json", request.getAsJsonObject("files").get("spaceContext").getAsString());
		assertEquals(
			"environment-north.png",
			environmentViews.getAsJsonArray("views").get(0).getAsJsonObject().get("imageFile").getAsString()
		);
	}
}
