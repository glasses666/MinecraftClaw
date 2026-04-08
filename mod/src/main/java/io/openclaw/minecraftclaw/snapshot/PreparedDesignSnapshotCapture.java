package io.openclaw.minecraftclaw.snapshot;

import java.nio.file.Path;

public record PreparedDesignSnapshotCapture(
	Path rootDirectory,
	DesignSnapshot snapshot
) {
	public Path snapshotDirectory() {
		return rootDirectory.resolve(snapshot.snapshotId());
	}

	public Path imagePath(String imageFile) {
		return snapshotDirectory().resolve(imageFile);
	}
}
