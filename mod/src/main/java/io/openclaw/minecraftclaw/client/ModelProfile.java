package io.openclaw.minecraftclaw.client;

public record ModelProfile(
	String id,
	String label,
	ProviderType providerType,
	String baseUrl,
	String apiKey,
	String model,
	boolean supportsVision,
	boolean enabled
) {
}
