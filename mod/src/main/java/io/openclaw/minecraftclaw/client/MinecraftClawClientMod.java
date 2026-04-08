package io.openclaw.minecraftclaw.client;

import com.mojang.blaze3d.systems.RenderSystem;
import com.mojang.authlib.GameProfile;
import io.openclaw.minecraftclaw.MinecraftClawMod;
import io.openclaw.minecraftclaw.MinecraftClawItems;
import io.openclaw.minecraftclaw.snapshot.DesignSnapshotCaptureService;
import io.openclaw.minecraftclaw.snapshot.PreparedDesignSnapshotCapture;
import io.openclaw.minecraftclaw.selection.SelectionLimits;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.UUID;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientLifecycleEvents;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayConnectionEvents;
import net.fabricmc.fabric.api.client.rendering.v1.WorldRenderContext;
import net.fabricmc.fabric.api.client.rendering.v1.WorldRenderEvents;
import net.fabricmc.fabric.api.event.player.AttackBlockCallback;
import net.fabricmc.fabric.api.event.player.UseBlockCallback;
import net.fabricmc.fabric.api.event.player.UseItemCallback;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.network.OtherClientPlayerEntity;
import net.minecraft.client.option.KeyBinding;
import net.minecraft.client.texture.NativeImage;
import net.minecraft.client.util.ScreenshotRecorder;
import net.minecraft.client.util.InputUtil;
import net.minecraft.client.render.GameRenderer;
import net.minecraft.item.ItemStack;
import net.minecraft.text.Text;
import net.minecraft.util.ActionResult;
import net.minecraft.util.TypedActionResult;
import net.minecraft.entity.Entity;
import net.minecraft.util.math.BlockPos;
import org.lwjgl.glfw.GLFW;

public final class MinecraftClawClientMod implements ClientModInitializer {
	private static final SelectionBoxRenderer.SelectionVisual COMMITTED_SELECTION_VISUAL =
		new SelectionBoxRenderer.SelectionVisual(0.95F, 0.95F, 1.0F, 0.16F, 0.85F);
	private static final SelectionBoxRenderer.SelectionVisual PREVIEW_SELECTION_VISUAL =
		new SelectionBoxRenderer.SelectionVisual(0.95F, 0.95F, 1.0F, 0.10F, 0.65F);
	private static final SelectionState SELECTION_STATE = new SelectionState();
	private static final SnapshotCaptureScheduler SNAPSHOT_CAPTURE_SCHEDULER = new SnapshotCaptureScheduler();
	private static ActiveSnapshotCapture activeSnapshotCapture;
	private static KeyBinding allowAirSelectionKey;
	private static SelectionPersistence selectionPersistence;
	private static String activeSelectionScopeKey;

	@Override
	public void onInitializeClient() {
		allowAirSelectionKey = KeyBindingHelper.registerKeyBinding(new KeyBinding(
			"key.minecraftclaw.allow_air_selection",
			InputUtil.Type.KEYSYM,
			GLFW.GLFW_KEY_LEFT_ALT,
			"key.categories.minecraftclaw"
		));

		AttackBlockCallback.EVENT.register((player, world, hand, pos, direction) -> {
			if (!world.isClient()) {
				return ActionResult.PASS;
			}

			if (!player.getStackInHand(hand).isOf(MinecraftClawItems.AETHER_ARCHITECTS_WAND) || activeSnapshotCapture != null) {
				return ActionResult.PASS;
			}

			resolveCurrentSelectionTarget(MinecraftClient.getInstance()).ifPresentOrElse(
				(target) -> commitFirstCorner(player, target),
				() -> player.sendMessage(Text.literal("MinecraftClaw: no valid selection target."), false)
			);
			return ActionResult.FAIL;
		});

		UseBlockCallback.EVENT.register((player, world, hand, hitResult) -> {
			if (!world.isClient()) {
				return ActionResult.PASS;
			}

			if (!player.getStackInHand(hand).isOf(MinecraftClawItems.AETHER_ARCHITECTS_WAND) || activeSnapshotCapture != null) {
				return ActionResult.PASS;
			}

			WandInteractionPlanner.BlockUseIntent blockUseIntent = WandInteractionPlanner.resolveBlockUseIntent(
				player.isSneaking(),
				SELECTION_STATE.firstCorner().isPresent(),
				SELECTION_STATE.currentSelection().isPresent()
			);
			if (blockUseIntent == WandInteractionPlanner.BlockUseIntent.CAPTURE_SNAPSHOT) {
				requestSnapshotCapture();
				return ActionResult.FAIL;
			}
			if (blockUseIntent == WandInteractionPlanner.BlockUseIntent.REQUIRE_FIRST_CORNER) {
				player.sendMessage(Text.literal("MinecraftClaw: set the first corner before setting the second corner."), false);
				return ActionResult.FAIL;
			}

			resolveCurrentSelectionTarget(MinecraftClient.getInstance()).ifPresentOrElse(
				(target) -> commitSecondCorner(player, target),
				() -> player.sendMessage(Text.literal("MinecraftClaw: no valid selection target."), false)
			);
			return ActionResult.FAIL;
		});

		UseItemCallback.EVENT.register((player, world, hand) -> {
			ItemStack stack = player.getStackInHand(hand);
			if (!world.isClient() || !stack.isOf(MinecraftClawItems.AETHER_ARCHITECTS_WAND) || activeSnapshotCapture != null) {
				return TypedActionResult.pass(stack);
			}

			if (player.isSneaking() && SELECTION_STATE.currentSelection().isPresent()) {
				requestSnapshotCapture();
				return TypedActionResult.fail(stack);
			}

			Optional<BlockPos> selectionTarget = resolveCurrentSelectionTarget(MinecraftClient.getInstance());
			if (selectionTarget.isPresent()) {
				commitSecondCorner(player, selectionTarget.orElseThrow());
				return TypedActionResult.fail(stack);
			}

			return TypedActionResult.pass(stack);
		});

		WorldRenderEvents.LAST.register(MinecraftClawClientMod::renderSelectionFrame);
		WorldRenderEvents.LAST.register(MinecraftClawClientMod::captureEnvironmentFrame);
		ClientTickEvents.END_CLIENT_TICK.register(MinecraftClawClientMod::tickClient);
		ClientPlayConnectionEvents.DISCONNECT.register((handler, client) -> {
			persistCommittedSelection(client);
			activeSelectionScopeKey = null;
			SELECTION_STATE.clearPreviewTarget();
		});
		ClientLifecycleEvents.CLIENT_STOPPING.register(MinecraftClawClientMod::persistCommittedSelection);
	}

	private static void renderSelectionFrame(WorldRenderContext context) {
		double cameraX = context.camera().getPos().x;
		double cameraY = context.camera().getPos().y;
		double cameraZ = context.camera().getPos().z;

		SELECTION_STATE.currentSelection().ifPresent((selection) -> SelectionBoxRenderer.render(
			context.matrixStack(),
			SelectionBoxRenderer.worldBox(selection, cameraX, cameraY, cameraZ),
			COMMITTED_SELECTION_VISUAL
		));

		if (activeSnapshotCapture == null && isHoldingWand(MinecraftClient.getInstance())) {
			SELECTION_STATE.previewSelection().ifPresent((selection) -> SelectionBoxRenderer.render(
				context.matrixStack(),
				SelectionBoxRenderer.worldBox(selection, cameraX, cameraY, cameraZ),
				PREVIEW_SELECTION_VISUAL
			));
		}
	}

	private static String formatPos(BlockPos pos) {
		return pos.getX() + "," + pos.getY() + "," + pos.getZ();
	}

	private static void requestSnapshotCapture() {
		SNAPSHOT_CAPTURE_SCHEDULER.requestCapture();
	}

	private static void tickClient(MinecraftClient client) {
		syncSelectionScope(client);
		updatePreviewTarget(client);
		handleAirSelectionAttackFallback(client);
		flushPendingSnapshotCapture(client);
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
			SELECTION_STATE.clearPreviewTarget();
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

	private static void syncSelectionScope(MinecraftClient client) {
		if (activeSnapshotCapture != null) {
			return;
		}

		Optional<ClientSelectionScopeResolver.SelectionScope> scope = ClientSelectionScopeResolver.resolve(client);
		if (scope.isEmpty()) {
			activeSelectionScopeKey = null;
			return;
		}

		String nextScopeKey = scope.orElseThrow().key();
		if (nextScopeKey.equals(activeSelectionScopeKey)) {
			return;
		}

		activeSelectionScopeKey = nextScopeKey;
		SELECTION_STATE.clearPreviewTarget();
		SELECTION_STATE.clearCommittedSelection();

		try {
			selectionPersistence(client).loadInto(
				scope.orElseThrow().worldScope(),
				scope.orElseThrow().dimensionId(),
				SELECTION_STATE
			);
		} catch (IOException exception) {
			MinecraftClawMod.LOGGER.warn("MinecraftClaw failed to restore persisted selection", exception);
		}
	}

	private static void updatePreviewTarget(MinecraftClient client) {
		if (activeSnapshotCapture != null || !isHoldingWand(client)) {
			SELECTION_STATE.clearPreviewTarget();
			return;
		}

		resolveCurrentSelectionTarget(client).ifPresentOrElse(
			SELECTION_STATE::setPreviewTarget,
			SELECTION_STATE::clearPreviewTarget
		);
	}

	private static void handleAirSelectionAttackFallback(MinecraftClient client) {
		if (activeSnapshotCapture != null || client.player == null || !isHoldingWand(client) || !isAirSelectionAllowed()) {
			return;
		}

		if (client.crosshairTarget == null || client.crosshairTarget.getType() != net.minecraft.util.hit.HitResult.Type.MISS) {
			return;
		}

		while (client.options.attackKey.wasPressed()) {
			resolveCurrentSelectionTarget(client).ifPresent((target) -> commitFirstCorner(client.player, target));
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

	private static Optional<BlockPos> resolveCurrentSelectionTarget(MinecraftClient client) {
		if (client == null || client.player == null) {
			return Optional.empty();
		}

		return CrosshairSelectionTargetResolver.resolve(
			client.crosshairTarget,
			client.player.getCameraPosVec(1.0F),
			isAirSelectionAllowed()
		);
	}

	private static boolean isHoldingWand(MinecraftClient client) {
		return client != null
			&& client.player != null
			&& client.player.getMainHandStack().isOf(MinecraftClawItems.AETHER_ARCHITECTS_WAND);
	}

	private static boolean isAirSelectionAllowed() {
		return allowAirSelectionKey != null && allowAirSelectionKey.isPressed();
	}

	private static void commitFirstCorner(net.minecraft.entity.player.PlayerEntity player, BlockPos pos) {
		SELECTION_STATE.clearCommittedSelection();
		SELECTION_STATE.setFirstCorner(pos);
		player.sendMessage(Text.literal("MinecraftClaw: first corner set to " + formatPos(pos)), false);
		persistCommittedSelection(MinecraftClient.getInstance());
	}

	private static void commitSecondCorner(net.minecraft.entity.player.PlayerEntity player, BlockPos pos) {
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

		persistCommittedSelection(MinecraftClient.getInstance());
	}

	private static void persistCommittedSelection(MinecraftClient client) {
		Optional<ClientSelectionScopeResolver.SelectionScope> scope = ClientSelectionScopeResolver.resolve(client);
		if (scope.isEmpty()) {
			return;
		}

		try {
			selectionPersistence(client).save(
				scope.orElseThrow().worldScope(),
				scope.orElseThrow().dimensionId(),
				SELECTION_STATE
			);
		} catch (IOException exception) {
			MinecraftClawMod.LOGGER.warn("MinecraftClaw failed to persist selection", exception);
		}
	}

	private static SelectionPersistence selectionPersistence(MinecraftClient client) {
		if (selectionPersistence == null) {
			Path stateDirectory = client.runDirectory.toPath().resolve("minecraftclaw").resolve("client-state");
			selectionPersistence = new SelectionPersistence(stateDirectory);
		}

		return selectionPersistence;
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
