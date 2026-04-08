package io.openclaw.minecraftclaw.client;

import java.util.List;

public final class EnvironmentCaptureSession {
	private static final List<CaptureStep> STEPS = List.of(
		new CaptureStep("north", 180.0F, 0.0F, "environment-north.png"),
		new CaptureStep("east", 270.0F, 0.0F, "environment-east.png"),
		new CaptureStep("south", 0.0F, 0.0F, "environment-south.png"),
		new CaptureStep("west", 90.0F, 0.0F, "environment-west.png"),
		new CaptureStep("top-down", 180.0F, 90.0F, "environment-top-down.png")
	);

	private final float originalYaw;
	private final float originalPitch;
	private int nextStepIndex;
	private boolean directionStaged;

	public EnvironmentCaptureSession(float originalYaw, float originalPitch) {
		this.originalYaw = originalYaw;
		this.originalPitch = originalPitch;
	}

	public boolean hasDirectionReadyToStage() {
		return !directionStaged && !isComplete();
	}

	public CaptureStep stageNextDirection() {
		if (!hasDirectionReadyToStage()) {
			throw new IllegalStateException("No direction is ready to stage.");
		}

		directionStaged = true;
		return STEPS.get(nextStepIndex);
	}

	public CaptureStep markCurrentDirectionCaptured() {
		if (!directionStaged) {
			throw new IllegalStateException("Stage a direction before marking it captured.");
		}

		CaptureStep completed = STEPS.get(nextStepIndex);
		nextStepIndex += 1;
		directionStaged = false;
		return completed;
	}

	public boolean isComplete() {
		return nextStepIndex >= STEPS.size();
	}

	public float originalYaw() {
		return originalYaw;
	}

	public float originalPitch() {
		return originalPitch;
	}

	public record CaptureStep(
		String direction,
		float yaw,
		float pitch,
		String imageFile
	) {
	}
}
