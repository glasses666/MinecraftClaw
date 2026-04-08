package io.openclaw.minecraftclaw.client;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import net.minecraft.util.math.BlockPos;
import org.junit.jupiter.api.Test;

class SelectionStateTest {
	@Test
	void tracksCommittedCornersIndependentlyFromPreviewTarget() {
		SelectionState state = new SelectionState();
		state.setFirstCorner(new BlockPos(10, 64, 20));
		state.setPreviewTarget(new BlockPos(15, 70, 27));

		assertTrue(state.firstCorner().isPresent());
		assertTrue(state.previewTarget().isPresent());
		assertFalse(state.currentSelection().isPresent());
		assertTrue(state.previewSelection().isPresent());
	}

	@Test
	void clearsPreviewWithoutDroppingCommittedSelection() {
		SelectionState state = new SelectionState();
		state.setFirstCorner(new BlockPos(10, 64, 20));
		state.setSecondCorner(new BlockPos(15, 70, 27));
		state.setPreviewTarget(new BlockPos(18, 72, 29));

		state.clearPreviewTarget();

		assertTrue(state.currentSelection().isPresent());
		assertFalse(state.previewTarget().isPresent());
		assertFalse(state.previewSelection().isPresent());
		assertEquals(new BlockPos(10, 64, 20), state.firstCorner().orElseThrow());
		assertEquals(new BlockPos(15, 70, 27), state.secondCorner().orElseThrow());
	}
}
