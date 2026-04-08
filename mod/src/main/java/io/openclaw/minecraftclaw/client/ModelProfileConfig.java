package io.openclaw.minecraftclaw.client;

import java.util.List;

public record ModelProfileConfig(
	int version,
	List<ModelProfile> profiles,
	String lastUsedProfileId
) {
	public static ModelProfileConfig empty() {
		return new ModelProfileConfig(1, List.of(), null);
	}
}
