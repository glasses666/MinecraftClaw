package io.openclaw.minecraftclaw.export;

import net.minecraft.util.math.BlockPos;

public record RawScanRegions(
	BlockPos localMin,
	BlockPos localMax,
	int surfaceMinX,
	int surfaceMaxX,
	int surfaceMinZ,
	int surfaceMaxZ
) {
	public static RawScanRegions around(BlockPos center, RawExportProfile profile) {
		int halfLocalWidth = profile.localWidth() / 2;
		int halfLocalDepth = profile.localDepth() / 2;
		int halfLocalHeight = profile.localHeight() / 2;
		BlockPos localMin = new BlockPos(
			center.getX() - halfLocalWidth,
			center.getY() - halfLocalHeight,
			center.getZ() - halfLocalDepth
		);
		BlockPos localMax = new BlockPos(
			localMin.getX() + profile.localWidth() - 1,
			localMin.getY() + profile.localHeight() - 1,
			localMin.getZ() + profile.localDepth() - 1
		);

		int halfSurfaceWidth = profile.surfaceWidth() / 2;
		int halfSurfaceDepth = profile.surfaceDepth() / 2;

		return new RawScanRegions(
			localMin,
			localMax,
			center.getX() - halfSurfaceWidth,
			center.getX() - halfSurfaceWidth + profile.surfaceWidth() - 1,
			center.getZ() - halfSurfaceDepth,
			center.getZ() - halfSurfaceDepth + profile.surfaceDepth() - 1
		);
	}
}
