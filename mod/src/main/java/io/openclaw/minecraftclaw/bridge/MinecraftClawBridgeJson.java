package io.openclaw.minecraftclaw.bridge;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import java.util.Map;

final class MinecraftClawBridgeJson {
	private static final Gson GSON = new GsonBuilder().disableHtmlEscaping().create();

	private MinecraftClawBridgeJson() {
	}

	static TeleportRequest parseTeleportRequest(String requestBody) {
		TeleportRequest request = GSON.fromJson(requestBody, TeleportRequest.class);

		if (request == null || !request.isFinite()) {
			throw new IllegalArgumentException("Teleport coordinates must be finite numbers.");
		}

		return request;
	}

	static String playerResponse(BridgePlayerSnapshot player) {
		return GSON.toJson(Map.of(
			"status", "ok",
			"player", player
		));
	}

	static String errorResponse(String message) {
		return GSON.toJson(Map.of(
			"status", "error",
			"error", message
		));
	}
}
