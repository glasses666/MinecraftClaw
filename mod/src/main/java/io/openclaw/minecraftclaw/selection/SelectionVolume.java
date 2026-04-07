package io.openclaw.minecraftclaw.selection;

import net.minecraft.util.math.BlockPos;

public record SelectionVolume(BlockPos min, BlockPos max) {
	public static SelectionVolume between(BlockPos first, BlockPos second) {
		return new SelectionVolume(
			new BlockPos(
				Math.min(first.getX(), second.getX()),
				Math.min(first.getY(), second.getY()),
				Math.min(first.getZ(), second.getZ())
			),
			new BlockPos(
				Math.max(first.getX(), second.getX()),
				Math.max(first.getY(), second.getY()),
				Math.max(first.getZ(), second.getZ())
			)
		);
	}

	public int width() {
		return max.getX() - min.getX() + 1;
	}

	public int height() {
		return max.getY() - min.getY() + 1;
	}

	public int depth() {
		return max.getZ() - min.getZ() + 1;
	}

	public int volume() {
		return width() * height() * depth();
	}
}
