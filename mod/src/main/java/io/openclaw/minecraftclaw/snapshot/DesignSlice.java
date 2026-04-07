package io.openclaw.minecraftclaw.snapshot;

import java.util.List;

public record DesignSlice(
	int y,
	List<String> rows
) {
}
