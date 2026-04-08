package io.openclaw.minecraftclaw.client;

public record RuntimeBlueprintStepPayload(
	String kind,
	LocalBlockPos from,
	LocalBlockPos to,
	LocalBlockPos at,
	LocalBlockPos offset,
	String blockId,
	String commandTemplate
) {
	public static RuntimeBlueprintStepPayload fill(LocalBlockPos from, LocalBlockPos to, String blockId) {
		return new RuntimeBlueprintStepPayload("fill", from, to, null, null, blockId, null);
	}

	public static RuntimeBlueprintStepPayload block(LocalBlockPos at, String blockId) {
		return new RuntimeBlueprintStepPayload("block", null, null, at, null, blockId, null);
	}

	public static RuntimeBlueprintStepPayload command(String commandTemplate, LocalBlockPos offset) {
		return new RuntimeBlueprintStepPayload("command", null, null, null, offset, null, commandTemplate);
	}
}
