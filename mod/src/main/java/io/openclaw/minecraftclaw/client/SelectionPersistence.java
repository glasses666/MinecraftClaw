package io.openclaw.minecraftclaw.client;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import java.io.IOException;
import java.io.Reader;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import net.minecraft.util.math.BlockPos;

public final class SelectionPersistence {
	private static final Gson GSON = new GsonBuilder().setPrettyPrinting().disableHtmlEscaping().create();
	private final Path stateFile;

	public SelectionPersistence(Path rootDirectory) {
		this.stateFile = rootDirectory.resolve("selection-state.json");
	}

	public static String scopeKey(String worldScope, String dimensionId) {
		return worldScope + "|" + dimensionId;
	}

	public void save(String worldScope, String dimensionId, SelectionState state) throws IOException {
		if (state.currentSelection().isEmpty()) {
			return;
		}

		StoredSelections selections = readSelections();
		selections.selections.put(
			scopeKey(worldScope, dimensionId),
			new StoredSelection(
				point(state.firstCorner().orElseThrow()),
				point(state.secondCorner().orElseThrow()),
				dimensionId,
				Instant.now().toString()
			)
		);

		writeSelections(selections);
	}

	public boolean loadInto(String worldScope, String dimensionId, SelectionState state) throws IOException {
		StoredSelection storedSelection = readSelections().selections.get(scopeKey(worldScope, dimensionId));
		if (storedSelection == null) {
			return false;
		}

		state.setCommittedSelection(
			new BlockPos(storedSelection.firstCorner.x, storedSelection.firstCorner.y, storedSelection.firstCorner.z),
			new BlockPos(storedSelection.secondCorner.x, storedSelection.secondCorner.y, storedSelection.secondCorner.z)
		);
		return true;
	}

	private StoredSelections readSelections() throws IOException {
		if (!Files.exists(stateFile)) {
			return new StoredSelections(1, new LinkedHashMap<>());
		}

		try (Reader reader = Files.newBufferedReader(stateFile, StandardCharsets.UTF_8)) {
			StoredSelections selections = GSON.fromJson(reader, StoredSelections.class);
			if (selections == null || selections.selections == null) {
				return new StoredSelections(1, new LinkedHashMap<>());
			}
			return selections;
		}
	}

	private void writeSelections(StoredSelections selections) throws IOException {
		Files.createDirectories(stateFile.getParent());
		try (Writer writer = Files.newBufferedWriter(stateFile, StandardCharsets.UTF_8)) {
			GSON.toJson(selections, writer);
		}
	}

	private static StoredPoint point(BlockPos blockPos) {
		return new StoredPoint(blockPos.getX(), blockPos.getY(), blockPos.getZ());
	}

	private record StoredSelections(
		int version,
		Map<String, StoredSelection> selections
	) {
	}

	private record StoredSelection(
		StoredPoint firstCorner,
		StoredPoint secondCorner,
		String dimensionId,
		String updatedAt
	) {
	}

	private record StoredPoint(
		int x,
		int y,
		int z
	) {
	}
}
