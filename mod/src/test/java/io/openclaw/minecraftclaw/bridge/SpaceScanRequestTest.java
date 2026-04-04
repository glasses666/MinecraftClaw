package io.openclaw.minecraftclaw.bridge;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class SpaceScanRequestTest {
	@Test
	void acceptsExpandedHighResolutionScanBounds() {
		assertTrue(new SpaceScanRequest(20, 24, 24).isValid());
	}

	@Test
	void rejectsValuesOutsideExpandedBounds() {
		assertFalse(new SpaceScanRequest(21, 24, 24).isValid());
		assertFalse(new SpaceScanRequest(20, 25, 24).isValid());
		assertFalse(new SpaceScanRequest(20, 24, 25).isValid());
	}
}
