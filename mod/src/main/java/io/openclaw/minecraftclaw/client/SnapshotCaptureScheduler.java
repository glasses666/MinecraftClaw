package io.openclaw.minecraftclaw.client;

public final class SnapshotCaptureScheduler {
	private boolean pendingCapture;

	public void requestCapture() {
		pendingCapture = true;
	}

	public boolean consumePendingCapture() {
		if (!pendingCapture) {
			return false;
		}

		pendingCapture = false;
		return true;
	}
}
