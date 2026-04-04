package io.openclaw.minecraftclaw.bridge;

public record BridgePlayerSnapshot(
	String name,
	String dimension,
	BridgeBlockPosition position,
	BridgeExactPosition exactPosition,
	float yaw,
	float pitch
) {
}
