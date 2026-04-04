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

	static SpaceScanRequest parseSpaceScanRequest(String requestBody) {
		SpaceScanRequestPayload payload = requestBody == null || requestBody.isBlank()
			? new SpaceScanRequestPayload()
			: GSON.fromJson(requestBody, SpaceScanRequestPayload.class);
		SpaceScanRequest request = new SpaceScanRequest(
			payload.radius != null ? payload.radius : SpaceScanRequest.DEFAULT_RADIUS,
			payload.down != null ? payload.down : SpaceScanRequest.DEFAULT_DOWN,
			payload.up != null ? payload.up : SpaceScanRequest.DEFAULT_UP
		);

		if (!request.isValid()) {
			throw new IllegalArgumentException("Space scan parameters must be integers within the supported bounds.");
		}

		return request;
	}

	static String playerResponse(BridgePlayerSnapshot player) {
		return GSON.toJson(Map.of(
			"status", "ok",
			"player", player
		));
	}

	static String spaceResponse(LocalSpaceSnapshot space) {
		return GSON.toJson(Map.of(
			"status", "ok",
			"space", space
		));
	}

	static String errorResponse(String message) {
		return GSON.toJson(Map.of(
			"status", "error",
			"error", message
		));
	}

	private static final class SpaceScanRequestPayload {
		private Integer radius;
		private Integer down;
		private Integer up;
	}
}
