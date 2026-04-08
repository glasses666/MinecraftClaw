package io.openclaw.minecraftclaw.client;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.openclaw.minecraftclaw.selection.SelectionVolume;
import net.minecraft.util.math.BlockPos;
import org.junit.jupiter.api.Test;

class SelectionCaptureViewPlannerTest {
	@Test
	void plansFourStableCardinalViewpointsAroundSelection() {
		SelectionVolume selection = SelectionVolume.between(
			new BlockPos(10, 64, 20),
			new BlockPos(15, 69, 27)
		);

		assertViewpoint(
			SelectionCaptureViewPlanner.plan(selection, "north"),
			"north",
			0.0F,
			selection.min().getZ() - 1
		);
		assertViewpoint(
			SelectionCaptureViewPlanner.plan(selection, "east"),
			"east",
			90.0F,
			selection.max().getX() + 1
		);
		assertViewpoint(
			SelectionCaptureViewPlanner.plan(selection, "south"),
			"south",
			180.0F,
			selection.max().getZ() + 1
		);
		assertViewpoint(
			SelectionCaptureViewPlanner.plan(selection, "west"),
			"west",
			270.0F,
			selection.min().getX() - 1
		);
	}

	@Test
	void plansTopDownViewpointAboveSelectionCenter() {
		SelectionVolume selection = SelectionVolume.between(
			new BlockPos(10, 64, 20),
			new BlockPos(15, 69, 27)
		);

		SelectionCaptureViewPlanner.Viewpoint viewpoint = SelectionCaptureViewPlanner.plan(selection, "top-down");

		assertEquals("top-down", viewpoint.direction());
		assertEquals(180.0F, viewpoint.yaw());
		assertEquals(90.0F, viewpoint.pitch());
		assertEquals("environment-top-down.png", viewpoint.imageFile());
		assertTrue(viewpoint.x() > selection.min().getX());
		assertTrue(viewpoint.x() < selection.max().getX() + 1);
		assertTrue(viewpoint.z() > selection.min().getZ());
		assertTrue(viewpoint.z() < selection.max().getZ() + 1);
		assertTrue(viewpoint.y() > selection.max().getY());
	}

	@Test
	void raisesCameraAboveSelectionAndTiltsTowardCenter() {
		SelectionVolume selection = SelectionVolume.between(
			new BlockPos(100, 64, 200),
			new BlockPos(111, 73, 211)
		);

		SelectionCaptureViewPlanner.Viewpoint viewpoint = SelectionCaptureViewPlanner.plan(selection, "north");

		assertTrue(viewpoint.y() > selection.max().getY());
		assertTrue(viewpoint.pitch() > 0.0F);
		assertEquals("environment-north.png", viewpoint.imageFile());
	}

	private static void assertViewpoint(
		SelectionCaptureViewPlanner.Viewpoint viewpoint,
		String expectedDirection,
		float expectedYaw,
		int outsideBoundary
	) {
		assertEquals(expectedDirection, viewpoint.direction());
		assertEquals(expectedYaw, viewpoint.yaw());

		if (expectedDirection.equals("north") || expectedDirection.equals("south")) {
			if (expectedDirection.equals("north")) {
				assertTrue(viewpoint.z() <= outsideBoundary);
			} else {
				assertTrue(viewpoint.z() >= outsideBoundary);
			}
		} else {
			if (expectedDirection.equals("east")) {
				assertTrue(viewpoint.x() >= outsideBoundary);
			} else {
				assertTrue(viewpoint.x() <= outsideBoundary);
			}
		}
	}
}
