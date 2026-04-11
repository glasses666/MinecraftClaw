package io.openclaw.minecraftclaw.client;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import net.minecraft.util.math.Box;
import org.junit.jupiter.api.Test;

class SelectionBoxRendererTest {
	@Test
	void buildsAxisAlignedCornerAccentSegmentsInsteadOfFilledCornerBoxes() {
		Box box = new Box(0.0D, 0.0D, 0.0D, 6.0D, 4.0D, 8.0D);

		List<SelectionBoxRenderer.LineSegment> segments = SelectionBoxRenderer.buildCornerAccentSegments(box, 0.72F);

		assertEquals(24, segments.size());
		for (SelectionBoxRenderer.LineSegment segment : segments) {
			double dx = Math.abs(segment.toX() - segment.fromX());
			double dy = Math.abs(segment.toY() - segment.fromY());
			double dz = Math.abs(segment.toZ() - segment.fromZ());
			int varyingAxes = (dx > 0.0D ? 1 : 0) + (dy > 0.0D ? 1 : 0) + (dz > 0.0D ? 1 : 0);
			assertEquals(1, varyingAxes, "Expected axis-aligned segment but got " + segment);
			assertTrue(segment.fromX() >= box.minX && segment.fromX() <= box.maxX);
			assertTrue(segment.toX() >= box.minX && segment.toX() <= box.maxX);
			assertTrue(segment.fromY() >= box.minY && segment.fromY() <= box.maxY);
			assertTrue(segment.toY() >= box.minY && segment.toY() <= box.maxY);
			assertTrue(segment.fromZ() >= box.minZ && segment.fromZ() <= box.maxZ);
			assertTrue(segment.toZ() >= box.minZ && segment.toZ() <= box.maxZ);
		}
	}
}
