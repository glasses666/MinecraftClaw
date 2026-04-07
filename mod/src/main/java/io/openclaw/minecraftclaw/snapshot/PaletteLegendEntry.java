package io.openclaw.minecraftclaw.snapshot;

import java.util.List;

public record PaletteLegendEntry(
	String token,
	String label,
	List<String> blockIds
) {
}
