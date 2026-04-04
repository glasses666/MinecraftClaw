package io.openclaw.minecraftclaw.export;

import java.util.List;
import java.util.Map;

public record RawExportSnapshot(
	Map<String, Object> scanMeta,
	Map<String, Object> playerState,
	List<Map<String, Object>> inventory,
	List<Map<String, Object>> localBlocks,
	List<Map<String, Object>> blockEntities,
	List<Map<String, Object>> entities,
	List<Map<String, Object>> surfaceMap
) {
}
