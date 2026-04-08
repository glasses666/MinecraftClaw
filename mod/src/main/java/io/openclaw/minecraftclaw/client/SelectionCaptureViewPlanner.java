package io.openclaw.minecraftclaw.client;

import io.openclaw.minecraftclaw.selection.SelectionVolume;

public final class SelectionCaptureViewPlanner {
	private SelectionCaptureViewPlanner() {
	}

	public static Viewpoint plan(SelectionVolume selection, String direction) {
		double centerX = (selection.min().getX() + selection.max().getX() + 1) / 2.0;
		double centerY = (selection.min().getY() + selection.max().getY() + 1) / 2.0;
		double centerZ = (selection.min().getZ() + selection.max().getZ() + 1) / 2.0;
		double lift = Math.max(4.0, selection.height() * 0.75);
		double distance = Math.max(6.0, Math.max(selection.width(), selection.depth()) * 1.5);
		double topDownHeight = selection.max().getY() + Math.max(10.0, Math.max(selection.width(), selection.depth()) * 1.75);

		return switch (direction) {
			case "north" -> new Viewpoint(
				direction,
				centerX,
				centerY + lift,
				selection.min().getZ() - distance,
				0.0F,
				pitchToward(centerY + lift, centerZ - distance, centerY, centerZ),
				"environment-north.png"
			);
			case "east" -> new Viewpoint(
				direction,
				selection.max().getX() + distance,
				centerY + lift,
				centerZ,
				90.0F,
				pitchToward(centerY + lift, centerX + distance, centerY, centerX),
				"environment-east.png"
			);
			case "south" -> new Viewpoint(
				direction,
				centerX,
				centerY + lift,
				selection.max().getZ() + distance,
				180.0F,
				pitchToward(centerY + lift, centerZ + distance, centerY, centerZ),
				"environment-south.png"
			);
			case "west" -> new Viewpoint(
				direction,
				selection.min().getX() - distance,
				centerY + lift,
				centerZ,
				270.0F,
				pitchToward(centerY + lift, centerX - distance, centerY, centerX),
				"environment-west.png"
			);
			case "top-down" -> new Viewpoint(
				direction,
				centerX,
				topDownHeight,
				centerZ,
				180.0F,
				90.0F,
				"environment-top-down.png"
			);
			default -> throw new IllegalArgumentException("Unsupported capture direction: " + direction);
		};
	}

	private static float pitchToward(double fromY, double fromHorizontal, double targetY, double targetHorizontal) {
		double deltaY = fromY - targetY;
		double horizontalDistance = Math.abs(fromHorizontal - targetHorizontal);
		return (float) Math.toDegrees(Math.atan2(deltaY, horizontalDistance));
	}

	public record Viewpoint(
		String direction,
		double x,
		double y,
		double z,
		float yaw,
		float pitch,
		String imageFile
	) {
	}
}
