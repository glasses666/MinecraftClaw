package io.openclaw.minecraftclaw.client;

import io.openclaw.minecraftclaw.selection.SelectionVolume;
import java.util.Optional;
import net.minecraft.util.math.BlockPos;

public final class SelectionState {
	private BlockPos firstCorner;
	private BlockPos secondCorner;
	private BlockPos previewTarget;
	private String lastSnapshotId;

	public void setFirstCorner(BlockPos firstCorner) {
		this.firstCorner = firstCorner.toImmutable();
	}

	public void setSecondCorner(BlockPos secondCorner) {
		this.secondCorner = secondCorner.toImmutable();
	}

	public void setCommittedSelection(BlockPos firstCorner, BlockPos secondCorner) {
		setFirstCorner(firstCorner);
		setSecondCorner(secondCorner);
	}

	public void clearCommittedSelection() {
		firstCorner = null;
		secondCorner = null;
	}

	public Optional<BlockPos> firstCorner() {
		return Optional.ofNullable(firstCorner);
	}

	public Optional<BlockPos> secondCorner() {
		return Optional.ofNullable(secondCorner);
	}

	public void setPreviewTarget(BlockPos previewTarget) {
		this.previewTarget = previewTarget == null ? null : previewTarget.toImmutable();
	}

	public void clearPreviewTarget() {
		previewTarget = null;
	}

	public Optional<BlockPos> previewTarget() {
		return Optional.ofNullable(previewTarget);
	}

	public Optional<SelectionVolume> currentSelection() {
		if (firstCorner == null || secondCorner == null) {
			return Optional.empty();
		}

		return Optional.of(SelectionVolume.between(firstCorner, secondCorner));
	}

	public Optional<SelectionVolume> previewSelection() {
		return SelectionPreviewPlanner.plan(firstCorner, previewTarget);
	}

	public Optional<String> lastSnapshotId() {
		return Optional.ofNullable(lastSnapshotId);
	}

	public void setLastSnapshotId(String lastSnapshotId) {
		this.lastSnapshotId = lastSnapshotId;
	}
}
