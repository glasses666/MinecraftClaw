package io.openclaw.minecraftclaw.bridge;

public record FillBoxRequest(int x1, int y1, int z1, int x2, int y2, int z2, String blockId) {
	public static final int MAX_VOLUME = 32_768;

	public boolean isValid() {
		return blockId != null && !blockId.isBlank() && volume() > 0 && volume() <= MAX_VOLUME;
	}

	public long volume() {
		return (long) (Math.abs(x2 - x1) + 1)
			* (Math.abs(y2 - y1) + 1)
			* (Math.abs(z2 - z1) + 1);
	}

	public BridgeBlockBounds bounds() {
		return new BridgeBlockBounds(
			new BridgeBlockPosition(Math.min(x1, x2), Math.min(y1, y2), Math.min(z1, z2)),
			new BridgeBlockPosition(Math.max(x1, x2), Math.max(y1, y2), Math.max(z1, z2))
		);
	}
}
