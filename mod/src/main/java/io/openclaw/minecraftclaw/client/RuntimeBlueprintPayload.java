package io.openclaw.minecraftclaw.client;

import java.util.List;

public record RuntimeBlueprintPayload(
	String id,
	int width,
	int depth,
	int height,
	List<RuntimeBlueprintStepPayload> steps
) {
}
