package io.openclaw.minecraftclaw.export;

import net.minecraft.util.math.BlockPos;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

final class RawScanRegionsTest {
	@Test
	void aroundBuildsStableLocalAndSurfaceBounds() {
		RawScanRegions regions = RawScanRegions.around(new BlockPos(100, 64, -20), RawExportProfile.defaultProfile());

		assertEquals(new BlockPos(92, 60, -28), regions.localMin());
		assertEquals(new BlockPos(107, 67, -13), regions.localMax());
		assertEquals(84, regions.surfaceMinX());
		assertEquals(115, regions.surfaceMaxX());
		assertEquals(-36, regions.surfaceMinZ());
		assertEquals(-5, regions.surfaceMaxZ());
	}
}
