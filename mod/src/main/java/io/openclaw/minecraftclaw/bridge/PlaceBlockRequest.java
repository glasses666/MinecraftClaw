package io.openclaw.minecraftclaw.bridge;

public record PlaceBlockRequest(int x, int y, int z, String blockId) {
	public boolean isValid() {
		return blockId != null && !blockId.isBlank();
	}

	public BridgeBlockPosition position() {
		return new BridgeBlockPosition(x, y, z);
	}
}
