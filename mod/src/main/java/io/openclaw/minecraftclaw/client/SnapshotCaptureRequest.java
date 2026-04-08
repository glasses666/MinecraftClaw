package io.openclaw.minecraftclaw.client;

import io.openclaw.minecraftclaw.snapshot.DesignPromptContext;

public record SnapshotCaptureRequest(
	DesignPromptContext promptContext,
	DesignGenerationLaunch generationLaunch
) {
	public static SnapshotCaptureRequest manual() {
		return new SnapshotCaptureRequest(new DesignPromptContext("", "", "", 3), null);
	}

	public static SnapshotCaptureRequest designGeneration(DesignGenerationLaunch generationLaunch) {
		return new SnapshotCaptureRequest(generationLaunch.promptInputs().toPromptContext(), generationLaunch);
	}

	public boolean startsDesignGeneration() {
		return generationLaunch != null;
	}
}
