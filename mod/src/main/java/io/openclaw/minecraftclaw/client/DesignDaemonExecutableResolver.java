package io.openclaw.minecraftclaw.client;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

public final class DesignDaemonExecutableResolver {
	private DesignDaemonExecutableResolver() {
	}

	public static Path resolve(String executableName, Map<String, String> environment, List<Path> fallbackCandidates) {
		String pathValue = environment.getOrDefault("PATH", "");
		for (String rawEntry : pathValue.split(java.io.File.pathSeparator)) {
			if (rawEntry == null || rawEntry.isBlank()) {
				continue;
			}

			Path candidate = Path.of(rawEntry).resolve(executableName).toAbsolutePath().normalize();
			if (Files.isRegularFile(candidate) && Files.isExecutable(candidate)) {
				return candidate;
			}
		}

		for (Path fallbackCandidate : fallbackCandidates) {
			if (Files.isRegularFile(fallbackCandidate) && Files.isExecutable(fallbackCandidate)) {
				return fallbackCandidate;
			}
		}

		return null;
	}
}
