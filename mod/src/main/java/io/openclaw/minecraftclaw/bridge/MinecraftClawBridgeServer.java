package io.openclaw.minecraftclaw.bridge;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MinecraftClawBridgeServer {
	private final MinecraftClawBridgeConfig config;
	private final MinecraftClawBridgeController controller;
	private HttpServer server;
	private ExecutorService executor;

	public MinecraftClawBridgeServer(MinecraftClawBridgeConfig config, MinecraftClawBridgeController controller) {
		this.config = config;
		this.controller = controller;
	}

	public void start() throws IOException {
		if (server != null) {
			return;
		}

		server = HttpServer.create(new InetSocketAddress(config.host(), config.port()), 0);
		executor = Executors.newCachedThreadPool((runnable) -> {
			Thread thread = new Thread(runnable, "minecraftclaw-bridge");
			thread.setDaemon(true);
			return thread;
		});
		server.setExecutor(executor);
		server.createContext("/player", this::handlePlayerState);
		server.createContext("/player/teleport", this::handleTeleportPlayer);
		server.createContext("/space/local", this::handleLocalSpace);
		server.createContext("/world/block/place", this::handlePlaceBlock);
		server.createContext("/world/fill", this::handleFillBox);
		server.createContext("/world/command", this::handleCommand);
		server.start();
	}

	public void stop() {
		if (server != null) {
			server.stop(0);
			server = null;
		}

		if (executor != null) {
			executor.shutdownNow();
			executor = null;
		}
	}

	public URI uri(String path) {
		if (server == null) {
			throw new IllegalStateException("Bridge server has not been started.");
		}

		InetSocketAddress address = server.getAddress();
		String normalizedPath = path.startsWith("/") ? path : "/" + path;
		return URI.create("http://" + config.host() + ":" + address.getPort() + normalizedPath);
	}

	private void handlePlayerState(HttpExchange exchange) throws IOException {
		handle(exchange, "GET", () -> controller.getPlayerState());
	}

	private void handleTeleportPlayer(HttpExchange exchange) throws IOException {
		handle(exchange, "POST", () -> {
			String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
			return controller.teleportPlayer(MinecraftClawBridgeJson.parseTeleportRequest(body));
		});
	}

	private void handleLocalSpace(HttpExchange exchange) throws IOException {
		handleSpace(exchange, "POST", () -> {
			String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
			return controller.scanLocalSpace(MinecraftClawBridgeJson.parseSpaceScanRequest(body));
		});
	}

	private void handlePlaceBlock(HttpExchange exchange) throws IOException {
		handleAction(exchange, "POST", () -> {
			String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
			return controller.placeBlock(MinecraftClawBridgeJson.parsePlaceBlockRequest(body));
		});
	}

	private void handleFillBox(HttpExchange exchange) throws IOException {
		handleAction(exchange, "POST", () -> {
			String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
			return controller.fillBox(MinecraftClawBridgeJson.parseFillBoxRequest(body));
		});
	}

	private void handleCommand(HttpExchange exchange) throws IOException {
		handleAction(exchange, "POST", () -> {
			String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
			return controller.runCommand(MinecraftClawBridgeJson.parseCommandRequest(body));
		});
	}

	private void handle(HttpExchange exchange, String expectedMethod, BridgeHandler handler) throws IOException {
		try (exchange) {
			if (!expectedMethod.equals(exchange.getRequestMethod())) {
				writeJsonResponse(exchange, 405, MinecraftClawBridgeJson.errorResponse("Method not allowed."));
				return;
			}

			BridgePlayerSnapshot player = handler.handle();
			writeJsonResponse(exchange, 200, MinecraftClawBridgeJson.playerResponse(player));
		} catch (IllegalArgumentException exception) {
			writeJsonResponse(exchange, 400, MinecraftClawBridgeJson.errorResponse(exception.getMessage()));
		} catch (IllegalStateException exception) {
			writeJsonResponse(exchange, 503, MinecraftClawBridgeJson.errorResponse(exception.getMessage()));
		} catch (Exception exception) {
			writeJsonResponse(exchange, 500, MinecraftClawBridgeJson.errorResponse(exception.getMessage()));
		}
	}

	private void handleSpace(HttpExchange exchange, String expectedMethod, SpaceHandler handler) throws IOException {
		try (exchange) {
			if (!expectedMethod.equals(exchange.getRequestMethod())) {
				writeJsonResponse(exchange, 405, MinecraftClawBridgeJson.errorResponse("Method not allowed."));
				return;
			}

			LocalSpaceSnapshot space = handler.handle();
			writeJsonResponse(exchange, 200, MinecraftClawBridgeJson.spaceResponse(space));
		} catch (IllegalArgumentException exception) {
			writeJsonResponse(exchange, 400, MinecraftClawBridgeJson.errorResponse(exception.getMessage()));
		} catch (IllegalStateException exception) {
			writeJsonResponse(exchange, 503, MinecraftClawBridgeJson.errorResponse(exception.getMessage()));
		} catch (Exception exception) {
			writeJsonResponse(exchange, 500, MinecraftClawBridgeJson.errorResponse(exception.getMessage()));
		}
	}

	private void handleAction(HttpExchange exchange, String expectedMethod, ActionHandler handler) throws IOException {
		try (exchange) {
			if (!expectedMethod.equals(exchange.getRequestMethod())) {
				writeJsonResponse(exchange, 405, MinecraftClawBridgeJson.errorResponse("Method not allowed."));
				return;
			}

			BridgeActionResult result = handler.handle();
			writeJsonResponse(exchange, 200, MinecraftClawBridgeJson.actionResponse(result));
		} catch (IllegalArgumentException exception) {
			writeJsonResponse(exchange, 400, MinecraftClawBridgeJson.errorResponse(exception.getMessage()));
		} catch (IllegalStateException exception) {
			writeJsonResponse(exchange, 503, MinecraftClawBridgeJson.errorResponse(exception.getMessage()));
		} catch (Exception exception) {
			writeJsonResponse(exchange, 500, MinecraftClawBridgeJson.errorResponse(exception.getMessage()));
		}
	}

	private static void writeJsonResponse(HttpExchange exchange, int statusCode, String body) throws IOException {
		byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
		exchange.getResponseHeaders().set("content-type", "application/json; charset=utf-8");
		exchange.sendResponseHeaders(statusCode, bytes.length);
		exchange.getResponseBody().write(bytes);
	}

	@FunctionalInterface
	private interface BridgeHandler {
		BridgePlayerSnapshot handle() throws Exception;
	}

	@FunctionalInterface
	private interface SpaceHandler {
		LocalSpaceSnapshot handle() throws Exception;
	}

	@FunctionalInterface
	private interface ActionHandler {
		BridgeActionResult handle() throws Exception;
	}
}
