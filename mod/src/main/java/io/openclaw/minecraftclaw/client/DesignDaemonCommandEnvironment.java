package io.openclaw.minecraftclaw.client;

import java.nio.file.Path;
import java.util.Map;

public final class DesignDaemonCommandEnvironment {
	private DesignDaemonCommandEnvironment() {
	}

	public static void prependExecutableDirectory(Map<String, String> environment, Path executablePath) {
		Path parent = executablePath.toAbsolutePath().normalize().getParent();
		if (parent == null) {
			return;
		}

		String parentString = parent.toString();
		String currentPath = environment.getOrDefault("PATH", "");
		if (currentPath.equals(parentString) || currentPath.startsWith(parentString + java.io.File.pathSeparator)) {
			return;
		}

		if (currentPath.isBlank()) {
			environment.put("PATH", parentString);
			return;
		}

		environment.put("PATH", parentString + java.io.File.pathSeparator + currentPath);
	}
}
