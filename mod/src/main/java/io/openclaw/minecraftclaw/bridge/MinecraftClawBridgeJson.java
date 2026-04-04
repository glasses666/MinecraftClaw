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

	static PlaceBlockRequest parsePlaceBlockRequest(String requestBody) {
		PlaceBlockRequestPayload payload = requestBody == null || requestBody.isBlank()
			? new PlaceBlockRequestPayload()
			: GSON.fromJson(requestBody, PlaceBlockRequestPayload.class);

		if (payload.x == null || payload.y == null || payload.z == null || payload.blockId == null) {
			throw new IllegalArgumentException("Place-block requests require x, y, z, and blockId.");
		}

		PlaceBlockRequest request = new PlaceBlockRequest(payload.x, payload.y, payload.z, payload.blockId);
		if (!request.isValid()) {
			throw new IllegalArgumentException("Place-block requests require a non-empty blockId.");
		}

		return request;
	}

	static FillBoxRequest parseFillBoxRequest(String requestBody) {
		FillBoxRequestPayload payload = requestBody == null || requestBody.isBlank()
			? new FillBoxRequestPayload()
			: GSON.fromJson(requestBody, FillBoxRequestPayload.class);

		if (payload.x1 == null || payload.y1 == null || payload.z1 == null
			|| payload.x2 == null || payload.y2 == null || payload.z2 == null
			|| payload.blockId == null) {
			throw new IllegalArgumentException("Fill requests require x1, y1, z1, x2, y2, z2, and blockId.");
		}

		FillBoxRequest request = new FillBoxRequest(
			payload.x1,
			payload.y1,
			payload.z1,
			payload.x2,
			payload.y2,
			payload.z2,
			payload.blockId
		);

		if (!request.isValid()) {
			throw new IllegalArgumentException("Fill requests require a non-empty blockId and a supported box volume.");
		}

		return request;
	}

	static CommandRequest parseCommandRequest(String requestBody) {
		CommandRequestPayload payload = requestBody == null || requestBody.isBlank()
			? new CommandRequestPayload()
			: GSON.fromJson(requestBody, CommandRequestPayload.class);
		CommandRequest request = new CommandRequest(payload.command);

		if (!request.isValid()) {
			throw new IllegalArgumentException("Command requests require a non-empty command.");
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

	static String actionResponse(BridgeActionResult result) {
		return GSON.toJson(Map.of(
			"status", "ok",
			"result", result
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

	private static final class PlaceBlockRequestPayload {
		private Integer x;
		private Integer y;
		private Integer z;
		private String blockId;
	}

	private static final class FillBoxRequestPayload {
		private Integer x1;
		private Integer y1;
		private Integer z1;
		private Integer x2;
		private Integer y2;
		private Integer z2;
		private String blockId;
	}

	private static final class CommandRequestPayload {
		private String command;
	}
}
