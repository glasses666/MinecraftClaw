package io.openclaw.minecraftclaw.client;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

public final class DesignDaemonClient {
	private static final Gson GSON = new GsonBuilder().disableHtmlEscaping().create();
	private final HttpClient httpClient;
	private final URI baseUri;
	private final String bearerToken;

	public DesignDaemonClient(HttpClient httpClient, URI baseUri, String bearerToken) {
		this.httpClient = httpClient;
		this.baseUri = baseUri;
		this.bearerToken = bearerToken;
	}

	public DesignCandidateResponsePayload generate(DesignGenerationRequestPayload request) throws IOException, InterruptedException {
		HttpRequest httpRequest = HttpRequest.newBuilder(baseUri.resolve("/design/generate"))
			.timeout(Duration.ofSeconds(30))
			.header("authorization", "Bearer " + bearerToken)
			.header("content-type", "application/json")
			.POST(HttpRequest.BodyPublishers.ofString(GSON.toJson(request), StandardCharsets.UTF_8))
			.build();
		HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
		if (response.statusCode() < 200 || response.statusCode() >= 300) {
			throw new IOException("Design daemon request failed: HTTP " + response.statusCode() + " " + response.body());
		}

		return GSON.fromJson(response.body(), DesignCandidateResponsePayload.class);
	}

	public boolean isHealthy() {
		try {
			HttpRequest httpRequest = HttpRequest.newBuilder(baseUri.resolve("/health"))
				.timeout(Duration.ofSeconds(5))
				.header("authorization", "Bearer " + bearerToken)
				.GET()
				.build();
			HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
			return response.statusCode() == 200 && response.body().contains("\"ok\"");
		} catch (IOException exception) {
			return false;
		} catch (InterruptedException exception) {
			Thread.currentThread().interrupt();
			return false;
		}
	}
}
