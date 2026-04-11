package io.openclaw.minecraftclaw.client;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class SnapshotCaptureSchedulerTest {
	@Test
	void hasNoPendingCaptureByDefault() {
		SnapshotCaptureScheduler scheduler = new SnapshotCaptureScheduler();

		assertNull(scheduler.consumePendingCapture());
	}

	@Test
	void consumesRequestedCaptureExactlyOnce() {
		SnapshotCaptureScheduler scheduler = new SnapshotCaptureScheduler();
		SnapshotCaptureRequest request = SnapshotCaptureRequest.manual();

		scheduler.requestCapture(request);

		assertEquals(request, scheduler.consumePendingCapture());
		assertNull(scheduler.consumePendingCapture());
	}

	@Test
	void coalescesRepeatedCaptureRequestsBeforeConsumption() {
		SnapshotCaptureScheduler scheduler = new SnapshotCaptureScheduler();
		SnapshotCaptureRequest first = SnapshotCaptureRequest.manual();
		SnapshotCaptureRequest second = SnapshotCaptureRequest.designGeneration(
			new DesignGenerationLaunch(
				new ModelProfile("profile", "Local", ProviderType.OPENAI_COMPATIBLE, "http://127.0.0.1:11434/v1", "key", "model", false, true),
				new DesignPromptInputs("prompt", "positive", "negative", 3)
			)
		);

		scheduler.requestCapture(first);
		scheduler.requestCapture(second);

		assertEquals(second, scheduler.consumePendingCapture());
		assertNull(scheduler.consumePendingCapture());
	}
}
