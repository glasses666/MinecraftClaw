package io.openclaw.minecraftclaw.client;

import java.util.Optional;
import net.minecraft.util.hit.BlockHitResult;
import net.minecraft.util.hit.HitResult;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.Vec3d;

public final class CrosshairSelectionTargetResolver {
	private static final double MIN_TARGET_DISTANCE_SQUARED = 4.0;

	private CrosshairSelectionTargetResolver() {
	}

	public static Optional<BlockPos> resolve(HitResult hitResult, Vec3d cameraPos, boolean allowAirSelection) {
		if (hitResult == null || cameraPos == null) {
			return Optional.empty();
		}

		BlockPos target = switch (hitResult.getType()) {
			case BLOCK -> resolveBlockHit((BlockHitResult) hitResult, allowAirSelection);
			case MISS -> allowAirSelection ? BlockPos.ofFloored(hitResult.getPos()) : null;
			default -> null;
		};

		if (target == null || target.toCenterPos().squaredDistanceTo(cameraPos) <= MIN_TARGET_DISTANCE_SQUARED) {
			return Optional.empty();
		}

		return Optional.of(target.toImmutable());
	}

	private static BlockPos resolveBlockHit(BlockHitResult hitResult, boolean allowAirSelection) {
		if (!allowAirSelection) {
			return hitResult.getBlockPos();
		}

		return hitResult.getBlockPos().offset(hitResult.getSide());
	}
}
