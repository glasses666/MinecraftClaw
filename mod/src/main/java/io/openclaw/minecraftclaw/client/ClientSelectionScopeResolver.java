package io.openclaw.minecraftclaw.client;

import java.util.Optional;
import net.minecraft.client.MinecraftClient;

public final class ClientSelectionScopeResolver {
	private ClientSelectionScopeResolver() {
	}

	public static Optional<SelectionScope> resolve(MinecraftClient client) {
		if (client == null || client.world == null || client.player == null) {
			return Optional.empty();
		}

		String dimensionId = client.world.getRegistryKey().getValue().toString();
		if (client.isInSingleplayer() && client.getServer() != null) {
			return Optional.of(new SelectionScope(
				"singleplayer:" + client.getServer().getSaveProperties().getLevelName(),
				dimensionId
			));
		}

		if (client.getCurrentServerEntry() != null) {
			return Optional.of(new SelectionScope(
				"multiplayer:" + client.getCurrentServerEntry().address,
				dimensionId
			));
		}

		return Optional.empty();
	}

	public record SelectionScope(
		String worldScope,
		String dimensionId
	) {
		public String key() {
			return SelectionPersistence.scopeKey(worldScope, dimensionId);
		}
	}
}
