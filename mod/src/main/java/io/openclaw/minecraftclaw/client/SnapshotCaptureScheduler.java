package io.openclaw.minecraftclaw.client;

public final class SnapshotCaptureScheduler {
	private SnapshotCaptureRequest pendingCapture;

	public void requestCapture(SnapshotCaptureRequest request) {
		pendingCapture = request;
	}

	public SnapshotCaptureRequest consumePendingCapture() {
		if (pendingCapture == null) {
			return null;
		}

		SnapshotCaptureRequest request = pendingCapture;
		pendingCapture = null;
		return request;
	}
}
