package io.openclaw.minecraftclaw.client;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class EnvironmentCaptureSessionTest {
	@Test
	void stagesDirectionsInCardinalOrder() {
		EnvironmentCaptureSession session = new EnvironmentCaptureSession(42.0F, 12.0F);

		assertEquals("north", session.stageNextDirection().direction());
		assertEquals("north", session.markCurrentDirectionCaptured().direction());
		assertEquals("east", session.stageNextDirection().direction());
		assertEquals("east", session.markCurrentDirectionCaptured().direction());
		assertEquals("south", session.stageNextDirection().direction());
		assertEquals("south", session.markCurrentDirectionCaptured().direction());
		assertEquals("west", session.stageNextDirection().direction());
		assertEquals("west", session.markCurrentDirectionCaptured().direction());
		assertEquals("top-down", session.stageNextDirection().direction());
		assertEquals("top-down", session.markCurrentDirectionCaptured().direction());
		assertTrue(session.isComplete());
	}

	@Test
	void exposesStableYawPitchAndImageFileForEachDirection() {
		EnvironmentCaptureSession session = new EnvironmentCaptureSession(0.0F, 0.0F);

		EnvironmentCaptureSession.CaptureStep north = session.stageNextDirection();
		assertEquals(180.0F, north.yaw());
		assertEquals(0.0F, north.pitch());
		assertEquals("environment-north.png", north.imageFile());
		session.markCurrentDirectionCaptured();

		EnvironmentCaptureSession.CaptureStep east = session.stageNextDirection();
		assertEquals(270.0F, east.yaw());
		assertEquals("environment-east.png", east.imageFile());
		session.markCurrentDirectionCaptured();

		session.stageNextDirection();
		session.markCurrentDirectionCaptured();
		session.stageNextDirection();
		session.markCurrentDirectionCaptured();

		EnvironmentCaptureSession.CaptureStep topDown = session.stageNextDirection();
		assertEquals("top-down", topDown.direction());
		assertEquals(90.0F, topDown.pitch());
		assertEquals("environment-top-down.png", topDown.imageFile());
	}

	@Test
	void doesNotAllowCapturingBeforeDirectionIsStaged() {
		EnvironmentCaptureSession session = new EnvironmentCaptureSession(0.0F, 0.0F);

		assertThrows(IllegalStateException.class, session::markCurrentDirectionCaptured);
	}

	@Test
	void doesNotAllowStagingSameDirectionTwiceBeforeCapture() {
		EnvironmentCaptureSession session = new EnvironmentCaptureSession(0.0F, 0.0F);

		session.stageNextDirection();

		assertThrows(IllegalStateException.class, session::stageNextDirection);
	}

	@Test
	void restoresOriginalViewAfterFinalCapture() {
		EnvironmentCaptureSession session = new EnvironmentCaptureSession(42.0F, 12.0F);

		while (!session.isComplete()) {
			session.stageNextDirection();
			session.markCurrentDirectionCaptured();
		}

		assertEquals(42.0F, session.originalYaw());
		assertEquals(12.0F, session.originalPitch());
		assertFalse(session.hasDirectionReadyToStage());
	}
}
