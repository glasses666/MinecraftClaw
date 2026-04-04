package io.openclaw.minecraftclaw.command;

import com.mojang.brigadier.CommandDispatcher;
import io.openclaw.minecraftclaw.MinecraftClawMod;
import net.minecraft.registry.RegistryKey;
import net.minecraft.server.command.CommandManager;
import net.minecraft.server.command.ServerCommandSource;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.text.Text;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

public final class MinecraftClawCommands {
	private MinecraftClawCommands() {
	}

	public static void register(
		CommandDispatcher<ServerCommandSource> dispatcher,
		net.minecraft.command.CommandRegistryAccess registryAccess,
		CommandManager.RegistrationEnvironment environment
	) {
		dispatcher.register(
			CommandManager.literal("mcclaw_ping")
				.requires(source -> source.hasPermissionLevel(2))
				.executes(context -> executePing(context.getSource()))
		);

		dispatcher.register(
			CommandManager.literal("mcclaw_player_state")
				.requires(source -> source.hasPermissionLevel(2))
				.executes(context -> executePlayerState(context.getSource()))
		);
	}

	private static int executePing(ServerCommandSource source) {
		source.sendFeedback(() -> Text.literal("MinecraftClaw bridge smoke test is ready."), false);
		return 1;
	}

	private static int executePlayerState(ServerCommandSource source) {
		ServerPlayerEntity player = source.getPlayer();

		if (player == null) {
			source.sendError(Text.literal("This command must be run by a player."));
			return 0;
		}

		BlockPos position = player.getBlockPos();
		RegistryKey<World> dimensionKey = player.getWorld().getRegistryKey();
		ServerWorld world = player.getServerWorld();
		String summary = String.format(
			"player=%s dimension=%s pos=%d,%d,%d yaw=%.2f pitch=%.2f health=%.1f food=%d worldTime=%d",
			player.getName().getString(),
			dimensionKey.getValue(),
			position.getX(),
			position.getY(),
			position.getZ(),
			player.getYaw(),
			player.getPitch(),
			player.getHealth(),
			player.getHungerManager().getFoodLevel(),
			world.getTime()
		);

		source.sendFeedback(() -> Text.literal(summary), false);
		MinecraftClawMod.LOGGER.info("Player state requested: {}", summary);
		return 1;
	}
}
