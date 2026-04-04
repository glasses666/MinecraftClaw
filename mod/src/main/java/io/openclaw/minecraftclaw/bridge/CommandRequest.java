package io.openclaw.minecraftclaw.bridge;

public record CommandRequest(String command) {
	public boolean isValid() {
		return command != null && !normalizedCommand().isBlank();
	}

	public String normalizedCommand() {
		if (command == null) {
			return "";
		}

		String trimmed = command.trim();
		return trimmed.startsWith("/") ? trimmed.substring(1).trim() : trimmed;
	}
}
