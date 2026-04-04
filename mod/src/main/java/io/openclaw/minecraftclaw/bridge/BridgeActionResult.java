package io.openclaw.minecraftclaw.bridge;

public record BridgeActionResult(
	String action,
	boolean success,
	String dimension,
	int changedBlocks,
	String blockId,
	BridgeBlockPosition primaryPosition,
	BridgeBlockBounds bounds,
	String command,
	Integer commandResult,
	String message
) {
}
