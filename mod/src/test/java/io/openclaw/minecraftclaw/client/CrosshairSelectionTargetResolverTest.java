package io.openclaw.minecraftclaw.client;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Optional;
import net.minecraft.util.hit.BlockHitResult;
import net.minecraft.util.hit.HitResult;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.Direction;
import net.minecraft.util.math.Vec3d;
import org.junit.jupiter.api.Test;

class CrosshairSelectionTargetResolverTest {
	@Test
	void returnsHitBlockInBlockOnlyMode() {
		Optional<BlockPos> resolved = CrosshairSelectionTargetResolver.resolve(
			new BlockHitResult(new Vec3d(10.2, 70.1, 20.8), Direction.UP, new BlockPos(10, 70, 20), false),
			new Vec3d(0.0, 64.0, 0.0),
			false
		);

		assertTrue(resolved.isPresent());
		assertEquals(new BlockPos(10, 70, 20), resolved.get());
	}

	@Test
	void returnsAdjacentAirBlockWhenAirSelectionIsEnabledAndBlockIsHit() {
		Optional<BlockPos> resolved = CrosshairSelectionTargetResolver.resolve(
			new BlockHitResult(new Vec3d(10.0, 70.0, 20.0), Direction.EAST, new BlockPos(10, 70, 20), false),
			new Vec3d(0.0, 64.0, 0.0),
			true
		);

		assertTrue(resolved.isPresent());
		assertEquals(new BlockPos(11, 70, 20), resolved.get());
	}

	@Test
	void returnsRayEndCellWhenAirSelectionIsEnabledAndRayMisses() {
		Optional<BlockPos> resolved = CrosshairSelectionTargetResolver.resolve(
			BlockHitResult.createMissed(new Vec3d(12.7, 75.2, -3.1), Direction.NORTH, new BlockPos(12, 75, -4)),
			new Vec3d(0.0, 64.0, 0.0),
			true
		);

		assertTrue(resolved.isPresent());
		assertEquals(new BlockPos(12, 75, -4), resolved.get());
	}

	@Test
	void rejectsTargetsAtOrWithinTwoBlocksOfTheCamera() {
		Optional<BlockPos> resolved = CrosshairSelectionTargetResolver.resolve(
			BlockHitResult.createMissed(new Vec3d(1.2, 64.0, 0.0), Direction.NORTH, new BlockPos(1, 64, 0)),
			new Vec3d(0.0, 64.0, 0.0),
			true
		);

		assertFalse(resolved.isPresent());
	}

	@Test
	void ignoresMissesWhenAirSelectionIsDisabled() {
		Optional<BlockPos> resolved = CrosshairSelectionTargetResolver.resolve(
			BlockHitResult.createMissed(new Vec3d(12.7, 75.2, -3.1), Direction.NORTH, new BlockPos(12, 75, -4)),
			new Vec3d(0.0, 64.0, 0.0),
			false
		);

		assertFalse(resolved.isPresent());
	}
}
