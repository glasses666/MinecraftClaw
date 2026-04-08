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
		RenderSystem.setShader(GameRenderer::getPositionColorProgram);
		VertexConsumerProvider.Immediate immediate = VertexConsumerProvider.immediate(Tessellator.getInstance().getBuffer());
		drawFilledBox(matrices, immediate.getBuffer(RenderLayer.getDebugFilledBox()), box, visual);
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
		float lineAlpha
	) {
	}
}
