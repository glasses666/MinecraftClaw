package io.openclaw.minecraftclaw.client;

import java.util.ArrayList;
import java.util.List;
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
import org.joml.Matrix3f;
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
		if (visual.lineAlpha() > 0.0F || visual.cornerAlpha() > 0.0F) {
			RenderSystem.setShader(GameRenderer::getRenderTypeLinesProgram);
			RenderSystem.lineWidth(2.0F);
			if (visual.cornerAlpha() > 0.0F) {
				drawCornerAccents(matrices, immediate.getBuffer(RenderLayer.getLines()), box, visual);
			}
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
		Matrix4f positionMatrix = matrices.peek().getPositionMatrix();
		Matrix3f normalMatrix = matrices.peek().getNormalMatrix();

		for (LineSegment segment : buildCornerAccentSegments(box, accentLength)) {
			line(
				consumer,
				positionMatrix,
				normalMatrix,
				(float) segment.fromX(),
				(float) segment.fromY(),
				(float) segment.fromZ(),
				(float) segment.toX(),
				(float) segment.toY(),
				(float) segment.toZ(),
				visual.red(),
				visual.green(),
				visual.blue(),
				visual.cornerAlpha()
			);
		}
	}

	static List<LineSegment> buildCornerAccentSegments(Box box, float accentLength) {
		List<LineSegment> segments = new ArrayList<>(24);
		double minX = box.minX;
		double minY = box.minY;
		double minZ = box.minZ;
		double maxX = box.maxX;
		double maxY = box.maxY;
		double maxZ = box.maxZ;

		addCornerSegments(segments, minX, minY, minZ, accentLength, true, true, true);
		addCornerSegments(segments, maxX, minY, minZ, accentLength, false, true, true);
		addCornerSegments(segments, minX, maxY, minZ, accentLength, true, false, true);
		addCornerSegments(segments, maxX, maxY, minZ, accentLength, false, false, true);
		addCornerSegments(segments, minX, minY, maxZ, accentLength, true, true, false);
		addCornerSegments(segments, maxX, minY, maxZ, accentLength, false, true, false);
		addCornerSegments(segments, minX, maxY, maxZ, accentLength, true, false, false);
		addCornerSegments(segments, maxX, maxY, maxZ, accentLength, false, false, false);
		return List.copyOf(segments);
	}

	private static void addCornerSegments(
		List<LineSegment> segments,
		double x,
		double y,
		double z,
		double length,
		boolean extendPositiveX,
		boolean extendPositiveY,
		boolean extendPositiveZ
	) {
		segments.add(new LineSegment(x, y, z, extendPositiveX ? x + length : x - length, y, z));
		segments.add(new LineSegment(x, y, z, x, extendPositiveY ? y + length : y - length, z));
		segments.add(new LineSegment(x, y, z, x, y, extendPositiveZ ? z + length : z - length));
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

	private static void line(
		VertexConsumer consumer,
		Matrix4f positionMatrix,
		Matrix3f normalMatrix,
		float fromX,
		float fromY,
		float fromZ,
		float toX,
		float toY,
		float toZ,
		float red,
		float green,
		float blue,
		float alpha
	) {
		float normalX = toX - fromX;
		float normalY = toY - fromY;
		float normalZ = toZ - fromZ;
		float length = (float) Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ);
		if (length > 0.0F) {
			normalX /= length;
			normalY /= length;
			normalZ /= length;
		}
		consumer.vertex(positionMatrix, fromX, fromY, fromZ).color(red, green, blue, alpha).normal(normalMatrix, normalX, normalY, normalZ).next();
		consumer.vertex(positionMatrix, toX, toY, toZ).color(red, green, blue, alpha).normal(normalMatrix, normalX, normalY, normalZ).next();
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

	record LineSegment(
		double fromX,
		double fromY,
		double fromZ,
		double toX,
		double toY,
		double toZ
	) {
	}
}
