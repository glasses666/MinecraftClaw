package io.openclaw.minecraftclaw.snapshot;

import java.util.List;

public record GameDesignContext(
	String minecraftVersion,
	List<ModInfo> mods
) {
}
