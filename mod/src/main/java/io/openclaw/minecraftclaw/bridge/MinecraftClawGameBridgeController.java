package io.openclaw.minecraftclaw.bridge;

import java.util.List;
import net.minecraft.block.Block;
import net.minecraft.block.BlockState;
import net.minecraft.registry.Registries;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.command.ServerCommandSource;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.util.Identifier;
import net.minecraft.util.math.BlockPos;

public final class MinecraftClawGameBridgeController implements MinecraftClawBridgeController {
	private final MinecraftServer server;

	public MinecraftClawGameBridgeController(MinecraftServer server) {
		this.server = server;
	}

	@Override
	public BridgePlayerSnapshot getPlayerState() {
		return server.submit(() -> captureSnapshot(requirePlayer())).join();
	}

	@Override
	public BridgePlayerSnapshot teleportPlayer(TeleportRequest request) {
		return server.submit(() -> {
			ServerPlayerEntity player = requirePlayer();
			player.teleport(player.getServerWorld(), request.x(), request.y(), request.z(), player.getYaw(), player.getPitch());
			return captureSnapshot(player);
		}).join();
	}

	@Override
	public LocalSpaceSnapshot scanLocalSpace(SpaceScanRequest request) {
		return server.submit(() -> LocalSpaceScanner.scan(requirePlayer(), request)).join();
	}

	@Override
	public BridgeActionResult placeBlock(PlaceBlockRequest request) {
		return server.submit(() -> {
			ServerPlayerEntity player = requirePlayer();
			ServerWorld world = player.getServerWorld();
			BlockPos target = new BlockPos(request.x(), request.y(), request.z());
			BlockState state = resolveBlockState(request.blockId());
			boolean changed = world.setBlockState(target, state, Block.NOTIFY_ALL);
			return new BridgeActionResult(
				"place_block",
				true,
				world.getRegistryKey().getValue().toString(),
				changed ? 1 : 0,
				request.blockId(),
				request.position(),
				new BridgeBlockBounds(request.position(), request.position()),
				null,
				null,
				(changed ? "Placed " : "No change for ") + request.blockId() + " at " + request.x() + "," + request.y() + "," + request.z()
			);
		}).join();
	}

	@Override
	public BridgeActionResult fillBox(FillBoxRequest request) {
		return server.submit(() -> {
			ServerPlayerEntity player = requirePlayer();
			ServerWorld world = player.getServerWorld();
			BridgeBlockBounds bounds = request.bounds();
			BlockState state = resolveBlockState(request.blockId());
			BlockPos.Mutable mutable = new BlockPos.Mutable();
			int changedBlocks = 0;

			for (int x = bounds.min().x(); x <= bounds.max().x(); x++) {
				for (int y = bounds.min().y(); y <= bounds.max().y(); y++) {
					for (int z = bounds.min().z(); z <= bounds.max().z(); z++) {
						mutable.set(x, y, z);
						if (world.setBlockState(mutable, state, Block.NOTIFY_ALL)) {
							changedBlocks++;
						}
					}
				}
			}

			return new BridgeActionResult(
				"fill_box",
				true,
				world.getRegistryKey().getValue().toString(),
				changedBlocks,
				request.blockId(),
				bounds.min(),
				bounds,
				null,
				null,
				"Filled " + changedBlocks + " blocks with " + request.blockId()
			);
		}).join();
	}

	@Override
	public BridgeActionResult runCommand(CommandRequest request) {
		return server.submit(() -> {
			ServerPlayerEntity player = requirePlayer();
			ServerCommandSource source = player.getCommandSource().withLevel(4).withSilent();
			int commandResult = server.getCommandManager().executeWithPrefix(source, request.normalizedCommand());
			return new BridgeActionResult(
				"run_command",
				true,
				player.getServerWorld().getRegistryKey().getValue().toString(),
				0,
				null,
				captureSnapshot(player).position(),
				null,
				request.normalizedCommand(),
				commandResult,
				"Executed command: " + request.normalizedCommand()
			);
		}).join();
	}

	private ServerPlayerEntity requirePlayer() {
		List<ServerPlayerEntity> players = server.getPlayerManager().getPlayerList();

		if (players.isEmpty()) {
			throw new IllegalStateException("No active player is currently connected.");
		}

		return players.get(0);
	}

	private static BridgePlayerSnapshot captureSnapshot(ServerPlayerEntity player) {
		BlockPos position = player.getBlockPos();
		return new BridgePlayerSnapshot(
			player.getName().getString(),
			player.getWorld().getRegistryKey().getValue().toString(),
			new BridgeBlockPosition(position.getX(), position.getY(), position.getZ()),
			new BridgeExactPosition(player.getX(), player.getY(), player.getZ()),
			player.getYaw(),
			player.getPitch()
		);
	}

	private static BlockState resolveBlockState(String blockId) {
		Identifier identifier = Identifier.tryParse(blockId);
		if (identifier == null) {
			throw new IllegalArgumentException("Invalid blockId: " + blockId);
		}

		return Registries.BLOCK.getOrEmpty(identifier)
			.orElseThrow(() -> new IllegalArgumentException("Unknown blockId: " + blockId))
			.getDefaultState();
	}
}
