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
	void inventoryEndpointReturnsCurrentPlayerInventory() throws IOException, InterruptedException {
		StubController controller = new StubController(snapshot(26, 269, 13));
		server = new MinecraftClawBridgeServer(new MinecraftClawBridgeConfig("127.0.0.1", 0), controller);
		server.start();

		HttpResponse<String> response = httpClient.send(
			HttpRequest.newBuilder(server.uri("/player/inventory")).GET().build(),
			HttpResponse.BodyHandlers.ofString()
		);

		assertEquals(200, response.statusCode());
		JsonObject json = JsonParser.parseString(response.body()).getAsJsonObject();
		assertEquals("ok", json.get("status").getAsString());
		assertEquals("GLAsserrrr", json.getAsJsonObject("inventory").get("playerName").getAsString());
		assertEquals(2, json.getAsJsonObject("inventory").get("selectedHotbarSlot").getAsInt());
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

	@Test
	void localSpaceEndpointReturnsCompressedSpaceModel() throws IOException, InterruptedException {
		StubController controller = new StubController(snapshot(26, 269, 13));
		server = new MinecraftClawBridgeServer(new MinecraftClawBridgeConfig("127.0.0.1", 0), controller);
		server.start();

		HttpResponse<String> response = httpClient.send(
			HttpRequest.newBuilder(server.uri("/space/local"))
				.header("content-type", "application/json")
				.POST(HttpRequest.BodyPublishers.ofString("{\"radius\":4,\"down\":4,\"up\":6}"))
				.build(),
			HttpResponse.BodyHandlers.ofString()
		);

		assertEquals(200, response.statusCode());
		assertNotNull(controller.lastSpaceScanRequest);
		assertEquals(4, controller.lastSpaceScanRequest.radius());
		assertEquals(4, controller.lastSpaceScanRequest.down());
		assertEquals(6, controller.lastSpaceScanRequest.up());

		JsonObject json = JsonParser.parseString(response.body()).getAsJsonObject();
		assertEquals("ok", json.get("status").getAsString());
		assertEquals(81, json.getAsJsonObject("space").getAsJsonObject("summary").get("sampledColumns").getAsInt());
		assertEquals(26, json.getAsJsonObject("space").getAsJsonArray("columns").get(0).getAsJsonObject().get("x").getAsInt());
	}

	@Test
	void placeBlockEndpointPassesBlockPlacementToController() throws IOException, InterruptedException {
		StubController controller = new StubController(snapshot(26, 269, 13));
		server = new MinecraftClawBridgeServer(new MinecraftClawBridgeConfig("127.0.0.1", 0), controller);
		server.start();

		HttpResponse<String> response = httpClient.send(
			HttpRequest.newBuilder(server.uri("/world/block/place"))
				.header("content-type", "application/json")
				.POST(HttpRequest.BodyPublishers.ofString("{\"x\":40,\"y\":270,\"z\":-8,\"blockId\":\"minecraft:gold_block\"}"))
				.build(),
			HttpResponse.BodyHandlers.ofString()
		);

		assertEquals(200, response.statusCode());
		assertNotNull(controller.lastPlaceBlockRequest);
		assertEquals("minecraft:gold_block", controller.lastPlaceBlockRequest.blockId());
		JsonObject json = JsonParser.parseString(response.body()).getAsJsonObject();
		assertEquals("ok", json.get("status").getAsString());
		assertEquals("place_block", json.getAsJsonObject("result").get("action").getAsString());
	}

	@Test
	void fillEndpointPassesBoxFillToController() throws IOException, InterruptedException {
		StubController controller = new StubController(snapshot(26, 269, 13));
		server = new MinecraftClawBridgeServer(new MinecraftClawBridgeConfig("127.0.0.1", 0), controller);
		server.start();

		HttpResponse<String> response = httpClient.send(
			HttpRequest.newBuilder(server.uri("/world/fill"))
				.header("content-type", "application/json")
				.POST(HttpRequest.BodyPublishers.ofString("{\"x1\":0,\"y1\":64,\"z1\":0,\"x2\":1,\"y2\":65,\"z2\":1,\"blockId\":\"minecraft:glass\"}"))
				.build(),
			HttpResponse.BodyHandlers.ofString()
		);

		assertEquals(200, response.statusCode());
		assertNotNull(controller.lastFillBoxRequest);
		assertEquals("minecraft:glass", controller.lastFillBoxRequest.blockId());
		JsonObject json = JsonParser.parseString(response.body()).getAsJsonObject();
		assertEquals("fill_box", json.getAsJsonObject("result").get("action").getAsString());
	}

	@Test
	void commandEndpointPassesRawCommandsToController() throws IOException, InterruptedException {
		StubController controller = new StubController(snapshot(26, 269, 13));
		server = new MinecraftClawBridgeServer(new MinecraftClawBridgeConfig("127.0.0.1", 0), controller);
		server.start();

		HttpResponse<String> response = httpClient.send(
			HttpRequest.newBuilder(server.uri("/world/command"))
				.header("content-type", "application/json")
				.POST(HttpRequest.BodyPublishers.ofString("{\"command\":\"time set day\"}"))
				.build(),
			HttpResponse.BodyHandlers.ofString()
		);

		assertEquals(200, response.statusCode());
		assertNotNull(controller.lastCommandRequest);
		assertEquals("time set day", controller.lastCommandRequest.command());
		JsonObject json = JsonParser.parseString(response.body()).getAsJsonObject();
		assertEquals("run_command", json.getAsJsonObject("result").get("action").getAsString());
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
		private SpaceScanRequest lastSpaceScanRequest;
		private PlaceBlockRequest lastPlaceBlockRequest;
		private FillBoxRequest lastFillBoxRequest;
		private CommandRequest lastCommandRequest;

		private StubController(BridgePlayerSnapshot playerState) {
			this.playerState = playerState;
		}

		@Override
		public BridgePlayerSnapshot getPlayerState() {
			return playerState;
		}

		@Override
		public InventorySnapshot getInventory() {
			return new InventorySnapshot(
				playerState.name(),
				2,
				java.util.List.of(
					new InventorySlot(0, "minecraft:stone", 64, "Stone"),
					new InventorySlot(1, "minecraft:glass", 32, "Glass")
				)
			);
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

		@Override
		public LocalSpaceSnapshot scanLocalSpace(SpaceScanRequest request) {
			lastSpaceScanRequest = request;
			return new LocalSpaceSnapshot(
				1,
				playerState,
				new LocalSpaceBounds(
					new BridgeBlockPosition(22, 265, 9),
					new BridgeBlockPosition(30, 275, 17)
				),
				request,
				new LocalSpaceSummary(
					81,
					891,
					222,
					662,
					7,
					19,
					java.util.List.of(new BlockCount("minecraft:grass_block", 28))
				),
				java.util.List.of(
					new LocalSpaceColumn(
						26,
						13,
						269,
						"minecraft:grass_block",
						269,
						6,
						java.util.List.of(
							new OccupiedRun(265, 268, "minecraft:stone"),
							new OccupiedRun(269, 269, "minecraft:grass_block")
						)
					)
				),
				java.util.List.of(
					new WalkableSurface(26, 269, 13, "minecraft:grass_block", 6)
				),
				java.util.List.of(
					new SpacePointOfInterest(
						"entity",
						"minecraft:villager",
						"Villager",
						new BridgeBlockPosition(24, 269, 11)
					)
				)
			);
		}

		@Override
		public BridgeActionResult placeBlock(PlaceBlockRequest request) {
			lastPlaceBlockRequest = request;
			return actionResult("place_block", 1, request.blockId());
		}

		@Override
		public BridgeActionResult fillBox(FillBoxRequest request) {
			lastFillBoxRequest = request;
			return actionResult("fill_box", 8, request.blockId());
		}

		@Override
		public BridgeActionResult runCommand(CommandRequest request) {
			lastCommandRequest = request;
			return new BridgeActionResult(
				"run_command",
				true,
				playerState.dimension(),
				0,
				null,
				null,
				null,
				request.command(),
				1,
				"Executed command: " + request.command()
			);
		}

		private BridgeActionResult actionResult(String action, int changedBlocks, String blockId) {
			return new BridgeActionResult(
				action,
				true,
				playerState.dimension(),
				changedBlocks,
				blockId,
				new BridgeBlockPosition(40, 270, -8),
				new BridgeBlockBounds(
					new BridgeBlockPosition(40, 270, -8),
					new BridgeBlockPosition(41, 271, -7)
				),
				null,
				null,
				"Applied " + blockId
			);
		}
	}
}
