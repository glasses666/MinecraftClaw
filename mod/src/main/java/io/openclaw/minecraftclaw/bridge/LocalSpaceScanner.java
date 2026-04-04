package io.openclaw.minecraftclaw.bridge;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import net.minecraft.block.BlockState;
import net.minecraft.block.entity.BlockEntity;
import net.minecraft.entity.Entity;
import net.minecraft.registry.Registries;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.Box;

final class LocalSpaceScanner {
	private static final int SPACE_SCHEMA_VERSION = 1;
	private static final int TOP_BLOCK_LIMIT = 8;

	private LocalSpaceScanner() {
	}

	static LocalSpaceSnapshot scan(ServerPlayerEntity player, SpaceScanRequest request) {
		ServerWorld world = player.getServerWorld();
		BlockPos center = player.getBlockPos();
		int minX = center.getX() - request.radius();
		int maxX = center.getX() + request.radius();
		int minY = center.getY() - request.down();
		int maxY = center.getY() + request.up();
		int minZ = center.getZ() - request.radius();
		int maxZ = center.getZ() + request.radius();

		List<LocalSpaceColumn> columns = new ArrayList<>();
		List<WalkableSurface> walkableSurfaces = new ArrayList<>();
		List<SpacePointOfInterest> pointsOfInterest = new ArrayList<>();
		Map<String, Integer> topBlockCounts = new HashMap<>();

		int occupiedBlocks = 0;
		int fluidBlocks = 0;

		for (int x = minX; x <= maxX; x++) {
			for (int z = minZ; z <= maxZ; z++) {
				List<OccupiedRun> occupiedRuns = new ArrayList<>();
				Integer highestOccupiedY = null;
				String topBlockId = null;
				Integer walkableY = null;
				Integer walkableHeadroom = null;
				String currentRunBlockId = null;
				int currentRunStart = 0;
				boolean currentRunActive = false;

				for (int y = minY; y <= maxY; y++) {
					BlockPos pos = new BlockPos(x, y, z);
					BlockState state = world.getBlockState(pos);
					boolean occupied = isOccupied(state, world, pos);
					boolean fluid = !state.getFluidState().isEmpty();

					if (occupied) {
						occupiedBlocks++;
						if (fluid) {
							fluidBlocks++;
						}

						String blockId = blockId(state);
						highestOccupiedY = y;
						topBlockId = blockId;

						if (currentRunActive && currentRunBlockId.equals(blockId)) {
							// extend the current run
						} else {
							if (currentRunActive) {
								occupiedRuns.add(new OccupiedRun(currentRunStart, y - 1, currentRunBlockId));
							}
							currentRunActive = true;
							currentRunStart = y;
							currentRunBlockId = blockId;
						}

						if (isWalkableSurface(state, world, pos)) {
							int headroom = countHeadroom(world, pos, maxY);
							if (headroom >= 2) {
								walkableSurfaces.add(new WalkableSurface(x, y, z, blockId, headroom));
								if (walkableY == null || y > walkableY) {
									walkableY = y;
									walkableHeadroom = headroom;
								}
							}
						}

						BlockEntity blockEntity = world.getBlockEntity(pos);
						if (blockEntity != null) {
							pointsOfInterest.add(new SpacePointOfInterest(
								"block_entity",
								blockId,
								blockId,
								new BridgeBlockPosition(x, y, z)
							));
						}
					} else if (currentRunActive) {
						occupiedRuns.add(new OccupiedRun(currentRunStart, y - 1, currentRunBlockId));
						currentRunActive = false;
					}
				}

				if (currentRunActive) {
					occupiedRuns.add(new OccupiedRun(currentRunStart, maxY, currentRunBlockId));
				}

				if (topBlockId != null) {
					topBlockCounts.merge(topBlockId, 1, Integer::sum);
				}

				columns.add(new LocalSpaceColumn(
					x,
					z,
					highestOccupiedY,
					topBlockId,
					walkableY,
					walkableHeadroom,
					List.copyOf(occupiedRuns)
				));
			}
		}

		Box box = new Box(minX, minY, minZ, maxX + 1, maxY + 1, maxZ + 1);
		for (Entity entity : world.getOtherEntities(player, box)) {
			pointsOfInterest.add(new SpacePointOfInterest(
				"entity",
				Registries.ENTITY_TYPE.getId(entity.getType()).toString(),
				entity.getName().getString(),
				new BridgeBlockPosition(entity.getBlockPos().getX(), entity.getBlockPos().getY(), entity.getBlockPos().getZ())
			));
		}

		int sampledColumns = (request.radius() * 2 + 1) * (request.radius() * 2 + 1);
		int sampledBlocks = sampledColumns * request.totalHeight();
		List<BlockCount> sortedTopBlocks = topBlockCounts.entrySet().stream()
			.sorted(Map.Entry.<String, Integer>comparingByValue(Comparator.reverseOrder()).thenComparing(Map.Entry::getKey))
			.limit(TOP_BLOCK_LIMIT)
			.map((entry) -> new BlockCount(entry.getKey(), entry.getValue()))
			.toList();

		return new LocalSpaceSnapshot(
			SPACE_SCHEMA_VERSION,
			capturePlayer(player),
			new LocalSpaceBounds(
				new BridgeBlockPosition(minX, minY, minZ),
				new BridgeBlockPosition(maxX, maxY, maxZ)
			),
			request,
			new LocalSpaceSummary(
				sampledColumns,
				sampledBlocks,
				occupiedBlocks,
				sampledBlocks - occupiedBlocks,
				fluidBlocks,
				walkableSurfaces.size(),
				sortedTopBlocks
			),
			List.copyOf(columns),
			List.copyOf(walkableSurfaces),
			List.copyOf(pointsOfInterest)
		);
	}

	private static BridgePlayerSnapshot capturePlayer(ServerPlayerEntity player) {
		BlockPos pos = player.getBlockPos();
		return new BridgePlayerSnapshot(
			player.getName().getString(),
			player.getWorld().getRegistryKey().getValue().toString(),
			new BridgeBlockPosition(pos.getX(), pos.getY(), pos.getZ()),
			new BridgeExactPosition(player.getX(), player.getY(), player.getZ()),
			player.getYaw(),
			player.getPitch()
		);
	}

	private static boolean isOccupied(BlockState state, ServerWorld world, BlockPos pos) {
		return !state.getCollisionShape(world, pos).isEmpty() || !state.getFluidState().isEmpty();
	}

	private static boolean isWalkableSurface(BlockState state, ServerWorld world, BlockPos pos) {
		return !state.getCollisionShape(world, pos).isEmpty() && state.getFluidState().isEmpty();
	}

	private static int countHeadroom(ServerWorld world, BlockPos pos, int maxY) {
		int clearBlocks = 0;
		for (int y = pos.getY() + 1; y <= maxY; y++) {
			BlockPos above = new BlockPos(pos.getX(), y, pos.getZ());
			BlockState state = world.getBlockState(above);
			if (isOccupied(state, world, above)) {
				break;
			}
			clearBlocks++;
		}
		return clearBlocks;
	}

	private static String blockId(BlockState state) {
		return Registries.BLOCK.getId(state.getBlock()).toString();
	}
}
