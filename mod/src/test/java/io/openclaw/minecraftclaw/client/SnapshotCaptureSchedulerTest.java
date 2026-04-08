package io.openclaw.minecraftclaw.client;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class SnapshotCaptureSchedulerTest {
	@Test
	void hasNoPendingCaptureByDefault() {
		SnapshotCaptureScheduler scheduler = new SnapshotCaptureScheduler();

		assertFalse(scheduler.consumePendingCapture());
	}

	@Test
	void consumesRequestedCaptureExactlyOnce() {
		SnapshotCaptureScheduler scheduler = new SnapshotCaptureScheduler();

		scheduler.requestCapture();

		assertTrue(scheduler.consumePendingCapture());
		assertFalse(scheduler.consumePendingCapture());
	}

	@Test
	void coalescesRepeatedCaptureRequestsBeforeConsumption() {
		SnapshotCaptureScheduler scheduler = new SnapshotCaptureScheduler();

		scheduler.requestCapture();
		scheduler.requestCapture();

		assertTrue(scheduler.consumePendingCapture());
		assertFalse(scheduler.consumePendingCapture());
	}
}
