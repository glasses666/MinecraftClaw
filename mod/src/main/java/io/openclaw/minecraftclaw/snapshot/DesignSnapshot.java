package io.openclaw.minecraftclaw.snapshot;

import io.openclaw.minecraftclaw.selection.SelectionVolume;

public record DesignSnapshot(
	String snapshotId,
	SelectionVolume selection,
	DesignPromptContext promptContext,
	DesignSpaceContext spaceContext,
	EnvironmentViews environmentViews,
	PlayerDesignContext playerContext,
	GameDesignContext gameContext,
	PaletteCatalog paletteCatalog
) {
}
