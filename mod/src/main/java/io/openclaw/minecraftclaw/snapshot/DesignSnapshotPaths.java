package io.openclaw.minecraftclaw.snapshot;

import java.nio.file.Path;

public record DesignSnapshotPaths(
	Path snapshotDirectory,
	Path requestFile,
	Path spaceContextFile,
	Path environmentViewsFile,
	Path playerContextFile,
	Path gameContextFile,
	Path paletteCatalogFile
) {
}
