package io.openclaw.minecraftclaw.export;

import java.util.List;

public record RawExportProfile(
	int localWidth,
	int localDepth,
	int localHeight,
	int surfaceWidth,
	int surfaceDepth,
	List<String> fileNames
) {
	public static RawExportProfile defaultProfile() {
		return new RawExportProfile(
			16,
			16,
			8,
			32,
			32,
			List.of(
				"scan_meta.json",
				"player_state.json",
				"inventory.json",
				"local_blocks.json",
				"block_entities.json",
				"entities.json",
				"surface_map.json"
			)
		);
	}
}
