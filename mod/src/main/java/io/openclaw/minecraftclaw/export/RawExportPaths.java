package io.openclaw.minecraftclaw.export;

import java.nio.file.Path;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

public record RawExportPaths(Path exportDirectory, List<Path> files) {
	private static final DateTimeFormatter EXPORT_TIMESTAMP =
		DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'").withZone(ZoneOffset.UTC);

	public static RawExportPaths create(Path root, String playerName, Instant instant, RawExportProfile profile) {
		String exportId = EXPORT_TIMESTAMP.format(instant) + "-" + sanitizePlayerName(playerName);
		Path exportDirectory = root.resolve("minecraftclaw").resolve("exports").resolve(exportId);
		List<Path> files = profile.fileNames().stream()
			.map(exportDirectory::resolve)
			.toList();
		return new RawExportPaths(exportDirectory, files);
	}

	private static String sanitizePlayerName(String playerName) {
		String normalized = playerName.toLowerCase(Locale.ROOT).trim().replaceAll("[^a-z0-9]+", "-");
		String collapsed = normalized.replaceAll("^-+|-+$", "");
		return collapsed.isEmpty() ? "player" : collapsed;
	}
}
