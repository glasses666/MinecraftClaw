package io.openclaw.minecraftclaw.bridge;

public record TeleportRequest(double x, double y, double z) {
	public boolean isFinite() {
		return Double.isFinite(x) && Double.isFinite(y) && Double.isFinite(z);
	}
}
