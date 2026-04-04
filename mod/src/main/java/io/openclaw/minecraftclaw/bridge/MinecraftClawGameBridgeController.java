package io.openclaw.minecraftclaw.bridge;

import java.util.List;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.network.ServerPlayerEntity;
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
}
