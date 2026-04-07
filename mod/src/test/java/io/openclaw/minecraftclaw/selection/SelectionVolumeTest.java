package io.openclaw.minecraftclaw.selection;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import net.minecraft.util.math.BlockPos;
import org.junit.jupiter.api.Test;

class SelectionVolumeTest {
	@Test
	void normalizesCornersIntoMinMaxAndDimensions() {
		SelectionVolume selection = SelectionVolume.between(
			new BlockPos(12, 70, -4),
			new BlockPos(5, 64, 3)
		);

		assertEquals(new BlockPos(5, 64, -4), selection.min());
		assertEquals(new BlockPos(12, 70, 3), selection.max());
		assertEquals(8, selection.width());
		assertEquals(7, selection.height());
		assertEquals(8, selection.depth());
		assertEquals(448, selection.volume());
	}

	@Test
	void evaluatesSoftAndHardLimits() {
		SelectionVolume medium = SelectionVolume.between(new BlockPos(0, 0, 0), new BlockPos(15, 11, 15));
		SelectionVolume oversized = SelectionVolume.between(new BlockPos(0, 0, 0), new BlockPos(40, 25, 40));

		assertFalse(SelectionLimits.defaultLimits().requiresLargeBuildWarning(medium));
		assertTrue(SelectionLimits.defaultLimits().requiresLargeBuildWarning(oversized));
		assertFalse(SelectionLimits.defaultLimits().isWithinHardLimit(oversized));
	}
}
