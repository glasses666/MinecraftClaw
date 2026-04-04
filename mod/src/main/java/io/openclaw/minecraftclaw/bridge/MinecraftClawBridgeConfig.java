package io.openclaw.minecraftclaw.bridge;

public record MinecraftClawBridgeConfig(String host, int port) {
	public static final String DEFAULT_HOST = "127.0.0.1";
	public static final int DEFAULT_PORT = 47_127;

	public static MinecraftClawBridgeConfig defaultConfig() {
		return new MinecraftClawBridgeConfig(DEFAULT_HOST, DEFAULT_PORT);
	}
}
