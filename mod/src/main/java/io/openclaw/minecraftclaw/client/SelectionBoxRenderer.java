package io.openclaw.minecraftclaw.client;

import com.mojang.blaze3d.systems.RenderSystem;
import io.openclaw.minecraftclaw.selection.SelectionVolume;
import net.minecraft.client.render.GameRenderer;
import net.minecraft.client.render.RenderLayer;
import net.minecraft.client.render.Tessellator;
import net.minecraft.client.render.VertexConsumer;
import net.minecraft.client.render.VertexConsumerProvider;
import net.minecraft.client.render.WorldRenderer;
import net.minecraft.client.util.math.MatrixStack;
import net.minecraft.util.math.Box;
import org.joml.Matrix4f;

public final class SelectionBoxRenderer {
	private SelectionBoxRenderer() {
	}

	public static void render(MatrixStack matrices, Box box, SelectionVisual visual) {
		RenderSystem.enableBlend();
		RenderSystem.defaultBlendFunc();
		VertexConsumerProvider.Immediate immediate = VertexConsumerProvider.immediate(Tessellator.getInstance().getBuffer());
		if (visual.fillAlpha() > 0.0F) {
			RenderSystem.setShader(GameRenderer::getPositionColorProgram);
			drawFilledBox(matrices, immediate.getBuffer(RenderLayer.getDebugFilledBox()), box, visual);
		}
		if (visual.cornerAlpha() > 0.0F) {
			RenderSystem.setShader(GameRenderer::getPositionColorProgram);
			drawCornerAccents(matrices, immediate.getBuffer(RenderLayer.getDebugFilledBox()), box, visual);
		}
		if (visual.lineAlpha() > 0.0F) {
			RenderSystem.setShader(GameRenderer::getRenderTypeLinesProgram);
			RenderSystem.lineWidth(2.0F);
			WorldRenderer.drawBox(
				matrices,
				immediate.getBuffer(RenderLayer.getLines()),
				box,
				visual.red(),
				visual.green(),
				visual.blue(),
				visual.lineAlpha()
			);
		}
		immediate.draw();
		RenderSystem.disableBlend();
	}

	public static Box worldBox(SelectionVolume selection, double cameraX, double cameraY, double cameraZ) {
		return new Box(selection.min(), selection.max().add(1, 1, 1)).offset(-cameraX, -cameraY, -cameraZ);
	}

	private static void drawFilledBox(MatrixStack matrices, VertexConsumer consumer, Box box, SelectionVisual visual) {
		Matrix4f positionMatrix = matrices.peek().getPositionMatrix();
		float minX = (float) box.minX;
		float minY = (float) box.minY;
		float minZ = (float) box.minZ;
		float maxX = (float) box.maxX;
		float maxY = (float) box.maxY;
		float maxZ = (float) box.maxZ;
		float red = visual.red();
		float green = visual.green();
		float blue = visual.blue();
		float alpha = visual.fillAlpha();

		quad(consumer, positionMatrix, red, green, blue, alpha, minX, minY, minZ, maxX, minY, minZ, maxX, maxY, minZ, minX, maxY, minZ);
		quad(consumer, positionMatrix, red, green, blue, alpha, maxX, minY, maxZ, minX, minY, maxZ, minX, maxY, maxZ, maxX, maxY, maxZ);
		quad(consumer, positionMatrix, red, green, blue, alpha, minX, minY, maxZ, minX, minY, minZ, minX, maxY, minZ, minX, maxY, maxZ);
		quad(consumer, positionMatrix, red, green, blue, alpha, maxX, minY, minZ, maxX, minY, maxZ, maxX, maxY, maxZ, maxX, maxY, minZ);
		quad(consumer, positionMatrix, red, green, blue, alpha, minX, maxY, minZ, maxX, maxY, minZ, maxX, maxY, maxZ, minX, maxY, maxZ);
		quad(consumer, positionMatrix, red, green, blue, alpha, minX, minY, maxZ, maxX, minY, maxZ, maxX, minY, minZ, minX, minY, minZ);
	}

	private static void drawCornerAccents(MatrixStack matrices, VertexConsumer consumer, Box box, SelectionVisual visual) {
		double sizeX = box.maxX - box.minX;
		double sizeY = box.maxY - box.minY;
		double sizeZ = box.maxZ - box.minZ;
		float accentLength = (float) Math.min(1.35D, Math.max(0.35D, Math.min(sizeX, Math.min(sizeY, sizeZ)) * 0.18D));
		float thickness = 0.045F;
		float red = visual.red();
		float green = visual.green();
		float blue = visual.blue();
		float alpha = visual.cornerAlpha();

		float minX = (float) box.minX;
		float minY = (float) box.minY;
		float minZ = (float) box.minZ;
		float maxX = (float) box.maxX;
		float maxY = (float) box.maxY;
		float maxZ = (float) box.maxZ;

		drawAccentSet(matrices, consumer, red, green, blue, alpha, minX, minY, minZ, accentLength, thickness, true, true, true);
		drawAccentSet(matrices, consumer, red, green, blue, alpha, maxX, minY, minZ, accentLength, thickness, false, true, true);
		drawAccentSet(matrices, consumer, red, green, blue, alpha, minX, maxY, minZ, accentLength, thickness, true, false, true);
		drawAccentSet(matrices, consumer, red, green, blue, alpha, maxX, maxY, minZ, accentLength, thickness, false, false, true);
		drawAccentSet(matrices, consumer, red, green, blue, alpha, minX, minY, maxZ, accentLength, thickness, true, true, false);
		drawAccentSet(matrices, consumer, red, green, blue, alpha, maxX, minY, maxZ, accentLength, thickness, false, true, false);
		drawAccentSet(matrices, consumer, red, green, blue, alpha, minX, maxY, maxZ, accentLength, thickness, true, false, false);
		drawAccentSet(matrices, consumer, red, green, blue, alpha, maxX, maxY, maxZ, accentLength, thickness, false, false, false);
	}

	private static void drawAccentSet(
		MatrixStack matrices,
		VertexConsumer consumer,
		float red,
		float green,
		float blue,
		float alpha,
		float x,
		float y,
		float z,
		float length,
		float thickness,
		boolean extendPositiveX,
		boolean extendPositiveY,
		boolean extendPositiveZ
	) {
		drawAccentBox(
			matrices,
			consumer,
			red,
			green,
			blue,
			alpha,
			extendPositiveX ? x : x - length,
			y - thickness,
			z - thickness,
			extendPositiveX ? x + length : x,
			y + thickness,
			z + thickness
		);
		drawAccentBox(
			matrices,
			consumer,
			red,
			green,
			blue,
			alpha,
			x - thickness,
			extendPositiveY ? y : y - length,
			z - thickness,
			x + thickness,
			extendPositiveY ? y + length : y,
			z + thickness
		);
		drawAccentBox(
			matrices,
			consumer,
			red,
			green,
			blue,
			alpha,
			x - thickness,
			y - thickness,
			extendPositiveZ ? z : z - length,
			x + thickness,
			y + thickness,
			extendPositiveZ ? z + length : z
		);
	}

	private static void drawAccentBox(
		MatrixStack matrices,
		VertexConsumer consumer,
		float red,
		float green,
		float blue,
		float alpha,
		float minX,
		float minY,
		float minZ,
		float maxX,
		float maxY,
		float maxZ
	) {
		drawFilledBox(
			matrices,
			consumer,
			new Box(minX, minY, minZ, maxX, maxY, maxZ),
			new SelectionVisual(red, green, blue, alpha, 0.0F, 0.0F)
		);
	}

	private static void quad(
		VertexConsumer consumer,
		Matrix4f positionMatrix,
		float red,
		float green,
		float blue,
		float alpha,
		float ax,
		float ay,
		float az,
		float bx,
		float by,
		float bz,
		float cx,
		float cy,
		float cz,
		float dx,
		float dy,
		float dz
	) {
		vertex(consumer, positionMatrix, ax, ay, az, red, green, blue, alpha);
		vertex(consumer, positionMatrix, bx, by, bz, red, green, blue, alpha);
		vertex(consumer, positionMatrix, cx, cy, cz, red, green, blue, alpha);
		vertex(consumer, positionMatrix, dx, dy, dz, red, green, blue, alpha);

		vertex(consumer, positionMatrix, dx, dy, dz, red, green, blue, alpha);
		vertex(consumer, positionMatrix, cx, cy, cz, red, green, blue, alpha);
		vertex(consumer, positionMatrix, bx, by, bz, red, green, blue, alpha);
		vertex(consumer, positionMatrix, ax, ay, az, red, green, blue, alpha);
	}

	private static void vertex(
		VertexConsumer consumer,
		Matrix4f positionMatrix,
		float x,
		float y,
		float z,
		float red,
		float green,
		float blue,
		float alpha
	) {
		consumer.vertex(positionMatrix, x, y, z).color(red, green, blue, alpha).next();
	}

	public record SelectionVisual(
		float red,
		float green,
		float blue,
		float fillAlpha,
		float lineAlpha,
		float cornerAlpha
	) {
	}
}
