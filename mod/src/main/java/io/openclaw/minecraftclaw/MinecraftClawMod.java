package io.openclaw.minecraftclaw;

import io.openclaw.minecraftclaw.command.MinecraftClawCommands;
import net.fabricmc.api.ModInitializer;
import net.fabricmc.fabric.api.command.v2.CommandRegistrationCallback;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class MinecraftClawMod implements ModInitializer {
	public static final String MOD_ID = "minecraftclaw";
	public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

	@Override
	public void onInitialize() {
		CommandRegistrationCallback.EVENT.register(MinecraftClawCommands::register);
		LOGGER.info("MinecraftClaw initialized");
	}
}
