package io.openclaw.minecraftclaw.client;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class DesignDaemonClientTest {
	private HttpServer server;

	@AfterEach
	void tearDown() {
		if (server != null) {
			server.stop(0);
		}
	}

	@Test
	void reportsFalseWhenHealthEndpointIsUnavailable() throws Exception {
		DesignDaemonClient client = new DesignDaemonClient(
			HttpClient.newHttpClient(),
			URI.create("http://127.0.0.1:6553"),
			"test-token"
		);

		assertFalse(client.isHealthy());
	}

	@Test
	void reportsTrueWhenHealthEndpointReturnsOk() throws Exception {
		server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
		server.createContext("/health", (exchange) -> writeJson(exchange, 200, "{\"status\":\"ok\"}"));
		server.start();

		DesignDaemonClient client = new DesignDaemonClient(
			HttpClient.newHttpClient(),
			URI.create("http://127.0.0.1:" + server.getAddress().getPort()),
			"test-token"
		);

		assertTrue(client.isHealthy());
	}

	private static void writeJson(HttpExchange exchange, int statusCode, String body) throws java.io.IOException {
		byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
		exchange.getResponseHeaders().add("content-type", "application/json");
		exchange.sendResponseHeaders(statusCode, bytes.length);
		exchange.getResponseBody().write(bytes);
		exchange.close();
	}
}
