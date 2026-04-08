package io.openclaw.minecraftclaw.client;

import com.mojang.blaze3d.systems.RenderSystem;
import com.mojang.authlib.GameProfile;
import io.openclaw.minecraftclaw.MinecraftClawItems;
import io.openclaw.minecraftclaw.snapshot.DesignSnapshotCaptureService;
import io.openclaw.minecraftclaw.snapshot.PreparedDesignSnapshotCapture;
import io.openclaw.minecraftclaw.selection.SelectionLimits;
import java.nio.file.Files;
import java.util.UUID;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.rendering.v1.WorldRenderContext;
import net.fabricmc.fabric.api.client.rendering.v1.WorldRenderEvents;
import net.fabricmc.fabric.api.event.player.AttackBlockCallback;
import net.fabricmc.fabric.api.event.player.UseBlockCallback;
import net.fabricmc.fabric.api.event.player.UseItemCallback;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.network.OtherClientPlayerEntity;
import net.minecraft.client.texture.NativeImage;
import net.minecraft.client.util.ScreenshotRecorder;
import net.minecraft.client.render.GameRenderer;
import net.minecraft.client.render.RenderLayer;
import net.minecraft.client.render.Tessellator;
import net.minecraft.client.render.VertexConsumerProvider;
import net.minecraft.client.render.WorldRenderer;
import net.minecraft.client.util.math.MatrixStack;
import net.minecraft.item.ItemStack;
import net.minecraft.text.Text;
import net.minecraft.util.ActionResult;
import net.minecraft.util.TypedActionResult;
import net.minecraft.entity.Entity;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.Box;

public final class MinecraftClawClientMod implements ClientModInitializer {
	private static final SelectionState SELECTION_STATE = new SelectionState();
	private static final SnapshotCaptureScheduler SNAPSHOT_CAPTURE_SCHEDULER = new SnapshotCaptureScheduler();
	private static ActiveSnapshotCapture activeSnapshotCapture;

	@Override
	public void onInitializeClient() {
		AttackBlockCallback.EVENT.register((player, world, hand, pos, direction) -> {
			if (!world.isClient()) {
				return ActionResult.PASS;
			}

			if (!player.getStackInHand(hand).isOf(MinecraftClawItems.AETHER_ARCHITECTS_WAND)) {
				return ActionResult.PASS;
			}

			SELECTION_STATE.setFirstCorner(pos);
			player.sendMessage(Text.literal("MinecraftClaw: first corner set to " + formatPos(pos)), false);
			return ActionResult.FAIL;
		});

		UseBlockCallback.EVENT.register((player, world, hand, hitResult) -> {
			if (!world.isClient()) {
				return ActionResult.PASS;
			}

			if (!player.getStackInHand(hand).isOf(MinecraftClawItems.AETHER_ARCHITECTS_WAND)) {
				return ActionResult.PASS;
			}

			WandInteractionPlanner.BlockUseIntent blockUseIntent = WandInteractionPlanner.resolveBlockUseIntent(
				player.isSneaking(),
				SELECTION_STATE.currentSelection().isPresent()
			);
			if (blockUseIntent == WandInteractionPlanner.BlockUseIntent.CAPTURE_SNAPSHOT) {
				requestSnapshotCapture();
				return ActionResult.FAIL;
			}

			BlockPos pos = hitResult.getBlockPos();
			SELECTION_STATE.setSecondCorner(pos);
			player.sendMessage(Text.literal("MinecraftClaw: second corner set to " + formatPos(pos)), false);

			SELECTION_STATE.currentSelection().ifPresent((selection) -> {
				SelectionLimits limits = SelectionLimits.defaultLimits();
				if (!limits.isWithinHardLimit(selection)) {
					player.sendMessage(Text.literal("MinecraftClaw: selection exceeds the hard limit."), false);
					return;
				}

				if (limits.requiresLargeBuildWarning(selection)) {
					player.sendMessage(Text.literal("MinecraftClaw: large build selection enabled for this draft."), false);
				}

				player.sendMessage(
					Text.literal(
						"MinecraftClaw: selection locked at "
							+ selection.width() + "x" + selection.height() + "x" + selection.depth()
							+ " (" + selection.volume() + " blocks)"
					),
					false
				);
			});
			return ActionResult.FAIL;
		});

		UseItemCallback.EVENT.register((player, world, hand) -> {
			ItemStack stack = player.getStackInHand(hand);
			if (!world.isClient() || !stack.isOf(MinecraftClawItems.AETHER_ARCHITECTS_WAND) || !player.isSneaking()) {
				return TypedActionResult.pass(stack);
			}

			requestSnapshotCapture();
			return TypedActionResult.fail(stack);
		});

		WorldRenderEvents.LAST.register(MinecraftClawClientMod::renderSelectionFrame);
		WorldRenderEvents.LAST.register(MinecraftClawClientMod::captureEnvironmentFrame);
		ClientTickEvents.END_CLIENT_TICK.register(MinecraftClawClientMod::flushPendingSnapshotCapture);
	}

	private static void renderSelectionFrame(WorldRenderContext context) {
		SELECTION_STATE.currentSelection().ifPresent((selection) -> {
			MatrixStack matrices = context.matrixStack();
			double cameraX = context.camera().getPos().x;
			double cameraY = context.camera().getPos().y;
			double cameraZ = context.camera().getPos().z;
			Box box = new Box(selection.min(), selection.max().add(1, 1, 1)).offset(-cameraX, -cameraY, -cameraZ);

			RenderSystem.setShader(GameRenderer::getRenderTypeLinesProgram);
			RenderSystem.lineWidth(2.0F);
			VertexConsumerProvider.Immediate immediate = VertexConsumerProvider.immediate(Tessellator.getInstance().getBuffer());
			WorldRenderer.drawBox(matrices, immediate.getBuffer(RenderLayer.getLines()), box, 0.95F, 0.95F, 1.0F, 0.85F);
			immediate.draw();
		});
	}

	private static String formatPos(BlockPos pos) {
		return pos.getX() + "," + pos.getY() + "," + pos.getZ();
	}

	private static void requestSnapshotCapture() {
		SNAPSHOT_CAPTURE_SCHEDULER.requestCapture();
	}

	private static void flushPendingSnapshotCapture(MinecraftClient client) {
		if (client.player == null || client.world == null) {
			return;
		}

		if (activeSnapshotCapture != null) {
			if (activeSnapshotCapture.session().hasDirectionReadyToStage()) {
				stageDirection(activeSnapshotCapture, activeSnapshotCapture.session().stageNextDirection());
			}
			return;
		}

		if (!SNAPSHOT_CAPTURE_SCHEDULER.consumePendingCapture()) {
			return;
		}

		try {
			PreparedDesignSnapshotCapture preparedCapture = DesignSnapshotCaptureService.prepareCapture(client, SELECTION_STATE);
			EnvironmentCaptureSession session = new EnvironmentCaptureSession(client.player.getYaw(), client.player.getPitch());
			Entity originalCameraEntity = client.getCameraEntity();
			OtherClientPlayerEntity cameraAnchor = new OtherClientPlayerEntity(
				client.world,
				new GameProfile(UUID.randomUUID(), "minecraftclaw_capture")
			);
			activeSnapshotCapture = new ActiveSnapshotCapture(preparedCapture, session, originalCameraEntity, cameraAnchor);
			stageDirection(activeSnapshotCapture, session.stageNextDirection());
			client.player.sendMessage(
				Text.literal("MinecraftClaw: capturing 5 environment screenshots for snapshot " + preparedCapture.snapshot().snapshotId()),
				false
			);
		} catch (Exception exception) {
			client.player.sendMessage(Text.literal("MinecraftClaw: snapshot capture failed: " + exception.getMessage()), false);
			activeSnapshotCapture = null;
		}
	}

	private static void captureEnvironmentFrame(WorldRenderContext context) {
		MinecraftClient client = MinecraftClient.getInstance();
		if (activeSnapshotCapture == null || client.player == null) {
			return;
		}

		EnvironmentCaptureSession session = activeSnapshotCapture.session();
		if (session.hasDirectionReadyToStage() || session.isComplete()) {
			return;
		}

		try {
			EnvironmentCaptureSession.CaptureStep completedStep = session.markCurrentDirectionCaptured();
			writeRenderedEnvironmentScreenshot(client, activeSnapshotCapture.preparedCapture().imagePath(completedStep.imageFile()));

			if (session.isComplete()) {
				restoreOriginalView(client, activeSnapshotCapture);
				var paths = DesignSnapshotCaptureService.writePreparedCapture(activeSnapshotCapture.preparedCapture());
				SELECTION_STATE.setLastSnapshotId(paths.snapshotDirectory().getFileName().toString());
				client.player.sendMessage(Text.literal("MinecraftClaw: design snapshot written to " + paths.snapshotDirectory()), false);
				activeSnapshotCapture = null;
			}
		} catch (Exception exception) {
			restoreOriginalView(client, activeSnapshotCapture);
			client.player.sendMessage(Text.literal("MinecraftClaw: snapshot capture failed: " + exception.getMessage()), false);
			activeSnapshotCapture = null;
		}
	}

	private static void stageDirection(ActiveSnapshotCapture activeCapture, EnvironmentCaptureSession.CaptureStep step) {
		MinecraftClient client = MinecraftClient.getInstance();
		SelectionCaptureViewPlanner.Viewpoint viewpoint = SelectionCaptureViewPlanner.plan(
			activeCapture.preparedCapture().snapshot().selection(),
			step.direction()
		);
		OtherClientPlayerEntity cameraAnchor = activeCapture.cameraAnchor();

		cameraAnchor.refreshPositionAndAngles(viewpoint.x(), viewpoint.y(), viewpoint.z(), viewpoint.yaw(), viewpoint.pitch());
		cameraAnchor.prevYaw = viewpoint.yaw();
		cameraAnchor.prevPitch = viewpoint.pitch();
		cameraAnchor.setHeadYaw(viewpoint.yaw());
		cameraAnchor.setBodyYaw(viewpoint.yaw());
		client.setCameraEntity(cameraAnchor);
	}

	private static void restoreOriginalView(MinecraftClient client, ActiveSnapshotCapture activeCapture) {
		if (activeCapture == null) {
			return;
		}

		Entity originalCameraEntity = activeCapture.originalCameraEntity();
		if (originalCameraEntity != null) {
			client.setCameraEntity(originalCameraEntity);
		} else if (client.player != null) {
			client.setCameraEntity(client.player);
		}
	}

	private static void writeRenderedEnvironmentScreenshot(MinecraftClient client, java.nio.file.Path imagePath) throws java.io.IOException {
		Files.createDirectories(imagePath.getParent());

		try (NativeImage framebufferImage = ScreenshotRecorder.takeScreenshot(client.getFramebuffer())) {
			if (framebufferImage.getWidth() == DesignSnapshotCaptureService.environmentScreenshotWidth()
				&& framebufferImage.getHeight() == DesignSnapshotCaptureService.environmentScreenshotHeight()) {
				framebufferImage.writeTo(imagePath);
				return;
			}

			try (
				NativeImage resizedImage = new NativeImage(
					DesignSnapshotCaptureService.environmentScreenshotWidth(),
					DesignSnapshotCaptureService.environmentScreenshotHeight(),
					false
				)
			) {
				framebufferImage.resizeSubRectTo(
					0,
					0,
					framebufferImage.getWidth(),
					framebufferImage.getHeight(),
					resizedImage
				);
				resizedImage.writeTo(imagePath);
			}
		}
	}

	private record ActiveSnapshotCapture(
		PreparedDesignSnapshotCapture preparedCapture,
		EnvironmentCaptureSession session,
		Entity originalCameraEntity,
		OtherClientPlayerEntity cameraAnchor
	) {
	}
}
