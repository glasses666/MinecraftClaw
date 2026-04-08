package io.openclaw.minecraftclaw.client;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.openclaw.minecraftclaw.selection.SelectionVolume;
import java.util.Optional;
import net.minecraft.util.math.BlockPos;
import org.junit.jupiter.api.Test;

class SelectionPreviewPlannerTest {
	@Test
	void createsPreviewVolumeWhenFirstCornerAndPreviewTargetExist() {
		Optional<SelectionVolume> preview = SelectionPreviewPlanner.plan(
			new BlockPos(10, 64, 20),
			new BlockPos(15, 70, 27)
		);

		assertTrue(preview.isPresent());
		assertEquals(new BlockPos(10, 64, 20), preview.get().min());
		assertEquals(new BlockPos(15, 70, 27), preview.get().max());
	}

	@Test
	void doesNotCreatePreviewWithoutFirstCorner() {
		assertFalse(SelectionPreviewPlanner.plan(null, new BlockPos(15, 70, 27)).isPresent());
	}

	@Test
	void doesNotCreatePreviewWithoutPreviewTarget() {
		assertFalse(SelectionPreviewPlanner.plan(new BlockPos(10, 64, 20), null).isPresent());
	}
}
