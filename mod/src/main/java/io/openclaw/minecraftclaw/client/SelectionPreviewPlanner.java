package io.openclaw.minecraftclaw.client;

import io.openclaw.minecraftclaw.selection.SelectionVolume;
import java.util.Optional;
import net.minecraft.util.math.BlockPos;

public final class SelectionPreviewPlanner {
	private SelectionPreviewPlanner() {
	}

	public static Optional<SelectionVolume> plan(BlockPos firstCorner, BlockPos previewTarget) {
		if (firstCorner == null || previewTarget == null) {
			return Optional.empty();
		}

		return Optional.of(SelectionVolume.between(firstCorner, previewTarget));
	}
}
