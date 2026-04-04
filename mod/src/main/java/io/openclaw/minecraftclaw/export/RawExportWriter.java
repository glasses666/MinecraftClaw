package io.openclaw.minecraftclaw.export;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Map;

public final class RawExportWriter {
	private static final Gson GSON = new GsonBuilder().setPrettyPrinting().disableHtmlEscaping().create();

	private RawExportWriter() {
	}

	public static RawExportPaths write(
		Path root,
		String playerName,
		Instant instant,
		RawExportProfile profile,
		RawExportSnapshot snapshot
	) throws IOException {
		RawExportPaths paths = RawExportPaths.create(root, playerName, instant, profile);
		Files.createDirectories(paths.exportDirectory());

		Map<String, Object> files = Map.of(
			"scan_meta.json", snapshot.scanMeta(),
			"player_state.json", snapshot.playerState(),
			"inventory.json", snapshot.inventory(),
			"local_blocks.json", snapshot.localBlocks(),
			"block_entities.json", snapshot.blockEntities(),
			"entities.json", snapshot.entities(),
			"surface_map.json", snapshot.surfaceMap()
		);

		for (String fileName : profile.fileNames()) {
			Path target = paths.exportDirectory().resolve(fileName);
			Object content = files.get(fileName);
			Files.writeString(target, GSON.toJson(content), StandardCharsets.UTF_8);
		}

		return paths;
	}
}
