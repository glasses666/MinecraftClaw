package io.openclaw.minecraftclaw.client;

public record DesignGenerationRequestPayload(
	String snapshotDir,
	String snapshotId,
	String providerProfileId,
	String providerType,
	String baseUrl,
	String apiKey,
	String model
) {
	public static DesignGenerationRequestPayload from(ModelProfile profile, String snapshotDir, String snapshotId) {
		return new DesignGenerationRequestPayload(
			snapshotDir,
			snapshotId,
			profile.id(),
			profile.providerType().serializedName(),
			profile.baseUrl(),
			profile.apiKey(),
			profile.model()
		);
	}
}
