package io.openclaw.minecraftclaw.client;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import net.minecraft.util.math.BlockPos;
import org.junit.jupiter.api.Test;

class SelectionPersistenceTest {
	@Test
	void buildsStableScopeKeyFromWorldAndDimension() {
		assertEquals(
			"singleplayer:utopia|minecraft:overworld",
			SelectionPersistence.scopeKey("singleplayer:utopia", "minecraft:overworld")
		);
	}

	@Test
	void savesAndLoadsCommittedSelectionForSameScope() throws Exception {
		Path root = Files.createTempDirectory("minecraftclaw-selection-persistence");
		SelectionPersistence persistence = new SelectionPersistence(root);
		SelectionState state = new SelectionState();
		state.setFirstCorner(new BlockPos(10, 64, 20));
		state.setSecondCorner(new BlockPos(15, 70, 27));

		persistence.save("singleplayer:utopia", "minecraft:overworld", state);

		SelectionState restored = new SelectionState();
		assertTrue(persistence.loadInto("singleplayer:utopia", "minecraft:overworld", restored));
		assertEquals(new BlockPos(10, 64, 20), restored.firstCorner().orElseThrow());
		assertEquals(new BlockPos(15, 70, 27), restored.secondCorner().orElseThrow());
	}

	@Test
	void keepsSelectionsIsolatedAcrossWorldScopes() throws Exception {
		Path root = Files.createTempDirectory("minecraftclaw-selection-persistence");
		SelectionPersistence persistence = new SelectionPersistence(root);
		SelectionState state = new SelectionState();
		state.setFirstCorner(new BlockPos(10, 64, 20));
		state.setSecondCorner(new BlockPos(15, 70, 27));

		persistence.save("singleplayer:utopia", "minecraft:overworld", state);

		SelectionState restored = new SelectionState();
		assertFalse(persistence.loadInto("multiplayer:example.org", "minecraft:overworld", restored));
		assertFalse(restored.currentSelection().isPresent());
	}
}
