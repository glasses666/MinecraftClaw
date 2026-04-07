package io.openclaw.minecraftclaw.snapshot;

import java.util.List;
import java.util.Map;

public record DesignSpaceContext(
	List<DesignSlice> slices,
	Map<String, PaletteLegendEntry> legend
) {
}
