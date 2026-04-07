package io.openclaw.minecraftclaw.client;

import io.openclaw.minecraftclaw.selection.SelectionVolume;
import java.util.Optional;
import net.minecraft.util.math.BlockPos;

public final class SelectionState {
	private BlockPos firstCorner;
	private BlockPos secondCorner;
	private String lastSnapshotId;

	public void setFirstCorner(BlockPos firstCorner) {
		this.firstCorner = firstCorner.toImmutable();
	}

	public void setSecondCorner(BlockPos secondCorner) {
		this.secondCorner = secondCorner.toImmutable();
	}

	public Optional<SelectionVolume> currentSelection() {
		if (firstCorner == null || secondCorner == null) {
			return Optional.empty();
		}

		return Optional.of(SelectionVolume.between(firstCorner, secondCorner));
	}

	public Optional<String> lastSnapshotId() {
		return Optional.ofNullable(lastSnapshotId);
	}

	public void setLastSnapshotId(String lastSnapshotId) {
		this.lastSnapshotId = lastSnapshotId;
	}
}
