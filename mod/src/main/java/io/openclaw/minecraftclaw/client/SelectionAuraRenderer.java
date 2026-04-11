package io.openclaw.minecraftclaw.client;

import io.openclaw.minecraftclaw.selection.SelectionVolume;
import net.minecraft.client.util.math.MatrixStack;
import net.minecraft.util.math.Box;

public final class SelectionAuraRenderer {
	private SelectionAuraRenderer() {
	}

	public static void render(MatrixStack matrices, SelectionVolume selection, double cameraX, double cameraY, double cameraZ, long timeMs) {
		int layers = 6;
		double totalDepth = selection.depth();
		for (int index = 0; index < layers; index += 1) {
			double phase = (timeMs / 800.0D) + index * 0.35D;
			float hue = (float) ((phase % 1.0D + 1.0D) % 1.0D);
			int rgb = java.awt.Color.HSBtoRGB(hue, 0.45F, 1.0F);
			float red = ((rgb >> 16) & 0xFF) / 255.0F;
			float green = ((rgb >> 8) & 0xFF) / 255.0F;
			float blue = (rgb & 0xFF) / 255.0F;
			double waveOffset = ((Math.sin(phase * Math.PI * 2.0D) + 1.0D) * 0.5D) * Math.max(1.0D, totalDepth - 1.0D);
			double stripeMinZ = selection.min().getZ() + Math.min(totalDepth - 0.1D, waveOffset);
			double stripeMaxZ = Math.min(selection.max().getZ() + 1.0D, stripeMinZ + Math.max(0.8D, totalDepth / 6.0D));

			SelectionBoxRenderer.render(
				matrices,
				new Box(
					selection.min().getX(),
					selection.min().getY(),
					stripeMinZ,
					selection.max().getX() + 1.0D,
					selection.max().getY() + 1.0D,
					stripeMaxZ
				).offset(-cameraX, -cameraY, -cameraZ),
				new SelectionBoxRenderer.SelectionVisual(red, green, blue, 0.05F, 0.0F, 0.0F)
			);
		}
	}
}
