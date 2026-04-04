package io.openclaw.minecraftclaw;

import io.openclaw.minecraftclaw.command.MinecraftClawCommands;
import io.openclaw.minecraftclaw.export.RawExportPaths;
import io.openclaw.minecraftclaw.export.RawExportService;
import net.fabricmc.api.ModInitializer;
import net.fabricmc.fabric.api.command.v2.CommandRegistrationCallback;
import net.fabricmc.fabric.api.networking.v1.ServerPlayConnectionEvents;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.text.Text;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class MinecraftClawMod implements ModInitializer {
	public static final String MOD_ID = "minecraftclaw";
	public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

	@Override
	public void onInitialize() {
		CommandRegistrationCallback.EVENT.register(MinecraftClawCommands::register);
		ServerPlayConnectionEvents.JOIN.register((handler, sender, server) -> bootstrapRawExport(handler.getPlayer()));
		LOGGER.info("MinecraftClaw initialized");
	}

	private static void bootstrapRawExport(ServerPlayerEntity player) {
		try {
			RawExportPaths paths = RawExportService.export(player);
			String message = "MinecraftClaw bootstrap raw export written to " + paths.exportDirectory();
			LOGGER.info(message);
			player.sendMessage(Text.literal(message), false);
		} catch (Exception exception) {
			LOGGER.error("MinecraftClaw bootstrap raw export failed", exception);
			player.sendMessage(Text.literal("MinecraftClaw bootstrap raw export failed: " + exception.getMessage()), false);
		}
	}
}
