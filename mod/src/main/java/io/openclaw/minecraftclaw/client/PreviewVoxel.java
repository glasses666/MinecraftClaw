package io.openclaw.minecraftclaw.client;

public record PreviewVoxel(
	int x,
	int y,
	int z,
	String blockId,
	String stateProperties
) {
	public String blockSpec() {
		if (stateProperties == null || stateProperties.isBlank()) {
			return blockId;
		}

		return blockId + "[" + stateProperties + "]";
	}
}
