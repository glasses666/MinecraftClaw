package io.openclaw.minecraftclaw.snapshot;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

public final class DesignSnapshotWriter {
	private static final Gson GSON = new GsonBuilder().setPrettyPrinting().disableHtmlEscaping().create();

	private DesignSnapshotWriter() {
	}

	public static DesignSnapshotPaths write(Path root, DesignSnapshot snapshot) throws IOException {
		Path snapshotDirectory = root.resolve(snapshot.snapshotId());
		Files.createDirectories(snapshotDirectory);

		DesignSnapshotPaths paths = new DesignSnapshotPaths(
			snapshotDirectory,
			snapshotDirectory.resolve("request.json"),
			snapshotDirectory.resolve("space-context.json"),
			snapshotDirectory.resolve("environment-views.json"),
			snapshotDirectory.resolve("player-context.json"),
			snapshotDirectory.resolve("game-context.json"),
			snapshotDirectory.resolve("palette-catalog.json")
		);

		Map<String, Object> request = Map.of(
			"snapshotId", snapshot.snapshotId(),
			"selection", Map.of(
				"absoluteBounds", Map.of(
					"min", Map.of("x", snapshot.selection().min().getX(), "y", snapshot.selection().min().getY(), "z", snapshot.selection().min().getZ()),
					"max", Map.of("x", snapshot.selection().max().getX(), "y", snapshot.selection().max().getY(), "z", snapshot.selection().max().getZ())
				),
				"dimensions", Map.of(
					"width", snapshot.selection().width(),
					"height", snapshot.selection().height(),
					"depth", snapshot.selection().depth()
				),
				"localOriginRule", "selection_min_corner"
			),
			"promptContext", snapshot.promptContext(),
			"files", Map.of(
				"spaceContext", "space-context.json",
				"environmentViews", "environment-views.json",
				"playerContext", "player-context.json",
				"gameContext", "game-context.json",
				"paletteCatalog", "palette-catalog.json"
			)
		);

		Files.writeString(paths.requestFile(), GSON.toJson(request), StandardCharsets.UTF_8);
		Files.writeString(paths.spaceContextFile(), GSON.toJson(snapshot.spaceContext()), StandardCharsets.UTF_8);
		Files.writeString(paths.environmentViewsFile(), GSON.toJson(snapshot.environmentViews()), StandardCharsets.UTF_8);
		Files.writeString(paths.playerContextFile(), GSON.toJson(snapshot.playerContext()), StandardCharsets.UTF_8);
		Files.writeString(paths.gameContextFile(), GSON.toJson(snapshot.gameContext()), StandardCharsets.UTF_8);
		Files.writeString(paths.paletteCatalogFile(), GSON.toJson(snapshot.paletteCatalog()), StandardCharsets.UTF_8);
		return paths;
	}
}
