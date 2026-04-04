package io.openclaw.minecraftclaw.bridge;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class MinecraftClawBridgeServerTest {
	private final HttpClient httpClient = HttpClient.newHttpClient();
	private MinecraftClawBridgeServer server;

	@AfterEach
	void tearDown() {
		if (server != null) {
			server.stop();
		}
	}

	@Test
	void playerEndpointReturnsCurrentPlayerState() throws IOException, InterruptedException {
		StubController controller = new StubController(snapshot(26, 269, 13));
		server = new MinecraftClawBridgeServer(new MinecraftClawBridgeConfig("127.0.0.1", 0), controller);
		server.start();

		HttpResponse<String> response = httpClient.send(
			HttpRequest.newBuilder(server.uri("/player")).GET().build(),
			HttpResponse.BodyHandlers.ofString()
		);

		assertEquals(200, response.statusCode());
		JsonObject json = JsonParser.parseString(response.body()).getAsJsonObject();
		assertEquals("ok", json.get("status").getAsString());
		assertEquals("GLAsserrrr", json.getAsJsonObject("player").get("name").getAsString());
		assertEquals(26, json.getAsJsonObject("player").getAsJsonObject("position").get("x").getAsInt());
	}

	@Test
	void teleportEndpointPassesAbsoluteCoordinatesToController() throws IOException, InterruptedException {
		StubController controller = new StubController(snapshot(26, 269, 13));
		server = new MinecraftClawBridgeServer(new MinecraftClawBridgeConfig("127.0.0.1", 0), controller);
		server.start();

		HttpResponse<String> response = httpClient.send(
			HttpRequest.newBuilder(server.uri("/player/teleport"))
				.header("content-type", "application/json")
				.POST(HttpRequest.BodyPublishers.ofString("{\"x\":40,\"y\":270,\"z\":-8}"))
				.build(),
			HttpResponse.BodyHandlers.ofString()
		);

		assertEquals(200, response.statusCode());
		assertNotNull(controller.lastTeleportRequest);
		assertEquals(40.0, controller.lastTeleportRequest.x());
		assertEquals(270.0, controller.lastTeleportRequest.y());
		assertEquals(-8.0, controller.lastTeleportRequest.z());

		JsonObject json = JsonParser.parseString(response.body()).getAsJsonObject();
		assertEquals(40, json.getAsJsonObject("player").getAsJsonObject("position").get("x").getAsInt());
		assertEquals(270, json.getAsJsonObject("player").getAsJsonObject("position").get("y").getAsInt());
		assertEquals(-8, json.getAsJsonObject("player").getAsJsonObject("position").get("z").getAsInt());
	}

	private static BridgePlayerSnapshot snapshot(int x, int y, int z) {
		return new BridgePlayerSnapshot(
			"GLAsserrrr",
			"minecraft:overworld",
			new BridgeBlockPosition(x, y, z),
			new BridgeExactPosition(x + 0.5, y, z + 0.5),
			-94.5f,
			-4.5f
		);
	}

	private static final class StubController implements MinecraftClawBridgeController {
		private BridgePlayerSnapshot playerState;
		private TeleportRequest lastTeleportRequest;

		private StubController(BridgePlayerSnapshot playerState) {
			this.playerState = playerState;
		}

		@Override
		public BridgePlayerSnapshot getPlayerState() {
			return playerState;
		}

		@Override
		public BridgePlayerSnapshot teleportPlayer(TeleportRequest request) {
			lastTeleportRequest = request;
			playerState = new BridgePlayerSnapshot(
				playerState.name(),
				playerState.dimension(),
				new BridgeBlockPosition((int) request.x(), (int) request.y(), (int) request.z()),
				new BridgeExactPosition(request.x(), request.y(), request.z()),
				0.0f,
				0.0f
			);
			return playerState;
		}
	}
}
