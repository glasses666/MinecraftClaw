package io.openclaw.minecraftclaw.bridge;

public record SpaceScanRequest(int radius, int down, int up) {
	public static final int DEFAULT_RADIUS = 8;
	public static final int DEFAULT_DOWN = 8;
	public static final int DEFAULT_UP = 12;
	public static final int MAX_RADIUS = 20;
	public static final int MAX_DOWN = 24;
	public static final int MAX_UP = 24;

	public static SpaceScanRequest defaultRequest() {
		return new SpaceScanRequest(DEFAULT_RADIUS, DEFAULT_DOWN, DEFAULT_UP);
	}

	public boolean isValid() {
		return isBounded(radius, 1, MAX_RADIUS) && isBounded(down, 1, MAX_DOWN) && isBounded(up, 1, MAX_UP);
	}

	public int totalHeight() {
		return down + up + 1;
	}

	private static boolean isBounded(int value, int min, int max) {
		return value >= min && value <= max;
	}
}
