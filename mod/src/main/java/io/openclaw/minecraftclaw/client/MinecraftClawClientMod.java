package io.openclaw.minecraftclaw.client;

import com.mojang.authlib.GameProfile;
import io.openclaw.minecraftclaw.MinecraftClawItems;
import io.openclaw.minecraftclaw.MinecraftClawMod;
import io.openclaw.minecraftclaw.selection.SelectionLimits;
import io.openclaw.minecraftclaw.selection.SelectionVolume;
import io.openclaw.minecraftclaw.snapshot.DesignSnapshotCaptureService;
import io.openclaw.minecraftclaw.snapshot.DesignSnapshotPaths;
import io.openclaw.minecraftclaw.snapshot.PreparedDesignSnapshotCapture;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
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
import net.minecraft.client.util.InputUtil;
import net.minecraft.client.util.ScreenshotRecorder;
import net.minecraft.entity.Entity;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.registry.Registries;
import net.minecraft.text.MutableText;
import net.minecraft.text.Text;
import net.minecraft.util.ActionResult;
import net.minecraft.util.Formatting;
import net.minecraft.util.Identifier;
import net.minecraft.util.TypedActionResult;
import net.minecraft.util.math.BlockPos;
import org.lwjgl.glfw.GLFW;

public final class MinecraftClawClientMod implements ClientModInitializer {
	private static final SelectionBoxRenderer.SelectionVisual COMMITTED_SELECTION_VISUAL =
		new SelectionBoxRenderer.SelectionVisual(0.95F, 0.95F, 1.0F, 0.16F, 0.85F);
	private static final SelectionBoxRenderer.SelectionVisual PREVIEW_SELECTION_VISUAL =
		new SelectionBoxRenderer.SelectionVisual(0.95F, 0.95F, 1.0F, 0.10F, 0.65F);
	private static final SelectionState SELECTION_STATE = new SelectionState();
	private static final SnapshotCaptureScheduler SNAPSHOT_CAPTURE_SCHEDULER = new SnapshotCaptureScheduler();
	private static final URI DESIGN_DAEMON_URI = URI.create("http://127.0.0.1:4867");
	private static final String DESIGN_DAEMON_TOKEN = "minecraftclaw-dev-token";

	private static ActiveSnapshotCapture activeSnapshotCapture;
	private static KeyBinding allowAirSelectionKey;
	private static KeyBinding openDesignScreenKey;
	private static KeyBinding previewCandidate1Key;
	private static KeyBinding previewCandidate2Key;
	private static KeyBinding previewCandidate3Key;
	private static SelectionPersistence selectionPersistence;
	private static String activeSelectionScopeKey;
	private static ModelProfileStore modelProfileStore;
	private static ModelProfileConfig modelProfileConfig = ModelProfileConfig.empty();
	private static DesignDaemonClient designDaemonClient;
	private static DesignDaemonLauncher designDaemonLauncher;
	private static CompletableFuture<DesignCandidateResponsePayload> pendingGenerationFuture;
	private static DesignGenerationLaunch pendingGenerationLaunch;
	private static DesignPreviewSession activePreviewSession;
	private static CompletableFuture<String> daemonBootstrapFuture;
	private static boolean daemonBootstrapReady;
	private static String daemonBootstrapFailure;
	private static boolean daemonBootstrapNotified;

	@Override
	public void onInitializeClient() {
		allowAirSelectionKey = KeyBindingHelper.registerKeyBinding(new KeyBinding(
			"key.minecraftclaw.allow_air_selection",
			InputUtil.Type.KEYSYM,
			GLFW.GLFW_KEY_LEFT_ALT,
			"key.categories.minecraftclaw"
		));
		openDesignScreenKey = KeyBindingHelper.registerKeyBinding(new KeyBinding(
			"key.minecraftclaw.open_design_screen",
			InputUtil.Type.KEYSYM,
			GLFW.GLFW_KEY_G,
			"key.categories.minecraftclaw"
		));
		previewCandidate1Key = KeyBindingHelper.registerKeyBinding(new KeyBinding(
			"key.minecraftclaw.preview_candidate_1",
			InputUtil.Type.KEYSYM,
			GLFW.GLFW_KEY_1,
			"key.categories.minecraftclaw"
		));
		previewCandidate2Key = KeyBindingHelper.registerKeyBinding(new KeyBinding(
			"key.minecraftclaw.preview_candidate_2",
			InputUtil.Type.KEYSYM,
			GLFW.GLFW_KEY_2,
			"key.categories.minecraftclaw"
		));
		previewCandidate3Key = KeyBindingHelper.registerKeyBinding(new KeyBinding(
			"key.minecraftclaw.preview_candidate_3",
			InputUtil.Type.KEYSYM,
			GLFW.GLFW_KEY_3,
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
				requestSnapshotCapture(SnapshotCaptureRequest.manual());
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
				requestSnapshotCapture(SnapshotCaptureRequest.manual());
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
			clearDesignPreviewState();
			activeSelectionScopeKey = null;
			SELECTION_STATE.clearPreviewTarget();
		});
		ClientLifecycleEvents.CLIENT_STOPPING.register((client) -> {
			persistCommittedSelection(client);
			clearDesignPreviewState();
			if (designDaemonLauncher != null) {
				designDaemonLauncher.stop();
			}
		});
	}

	static ModelProfileConfig currentModelProfileConfig() {
		ensureModelProfilesLoaded(MinecraftClient.getInstance());
		return modelProfileConfig;
	}

	static void saveModelProfileConfig(ModelProfileConfig config) {
		MinecraftClient client = MinecraftClient.getInstance();
		modelProfileConfig = config;
		try {
			modelProfileStore(client).save(config);
		} catch (IOException exception) {
			MinecraftClawMod.LOGGER.warn("MinecraftClaw failed to persist model profiles", exception);
		}
	}

	static Optional<SelectionVolume> currentSelection() {
		return SELECTION_STATE.currentSelection();
	}

	static boolean hasActivePreviewSession() {
		return activePreviewSession != null;
	}

	static void submitDesignGeneration(ModelProfile profile, DesignPromptInputs promptInputs) {
		MinecraftClient client = MinecraftClient.getInstance();
		if (client.player == null) {
			return;
		}
		ensureDesignDaemonBootstrapStarted(client);
		if (!daemonBootstrapReady) {
			if (daemonBootstrapFailure != null) {
				client.player.sendMessage(Text.literal("MinecraftClaw: design daemon unavailable: " + daemonBootstrapFailure), false);
			} else {
				client.player.sendMessage(Text.literal("MinecraftClaw: design daemon is still starting, try again in a moment."), false);
			}
			return;
		}
		if (promptInputs.prompt().isBlank()) {
			client.player.sendMessage(Text.literal("MinecraftClaw: enter a prompt before generating."), false);
			return;
		}
		if (!profile.enabled()) {
			client.player.sendMessage(Text.literal("MinecraftClaw: selected profile is disabled."), false);
			return;
		}
		if (activeSnapshotCapture != null || pendingGenerationFuture != null) {
			client.player.sendMessage(Text.literal("MinecraftClaw: generation is already in progress."), false);
			return;
		}

		clearDesignPreviewState();
		saveModelProfileConfig(new ModelProfileConfig(modelProfileConfig.version(), modelProfileConfig.profiles(), profile.id()));
		requestSnapshotCapture(SnapshotCaptureRequest.designGeneration(new DesignGenerationLaunch(profile, promptInputs)));
		client.player.sendMessage(
			Text.literal("MinecraftClaw: capturing a fresh snapshot before generating candidates with " + profile.label() + "."),
			false
		);
	}

	private static void renderSelectionFrame(WorldRenderContext context) {
		double cameraX = context.camera().getPos().x;
		double cameraY = context.camera().getPos().y;
		double cameraZ = context.camera().getPos().z;

		SELECTION_STATE.currentSelection().ifPresent((selection) -> {
			SelectionBoxRenderer.render(
				context.matrixStack(),
				SelectionBoxRenderer.worldBox(selection, cameraX, cameraY, cameraZ),
				COMMITTED_SELECTION_VISUAL
			);

			if (isDesignGenerationActive()) {
				SelectionAuraRenderer.render(context.matrixStack(), selection, cameraX, cameraY, cameraZ, System.currentTimeMillis());
			} else if (activePreviewSession != null) {
				activePreviewSession.activeCandidate().ifPresent((candidate) -> {
					if (candidate.localBlueprintJson() != null) {
						GhostStructureRenderer.render(
							context.matrixStack(),
							selection,
							CandidatePreviewCompiler.compile(candidate.localBlueprintJson()),
							cameraX,
							cameraY,
							cameraZ
						);
					}
				});
			}
		});

		if (activeSnapshotCapture == null && isHoldingWand(MinecraftClient.getInstance())) {
			SELECTION_STATE.previewSelection().ifPresent((selection) -> SelectionBoxRenderer.render(
				context.matrixStack(),
				SelectionBoxRenderer.worldBox(selection, cameraX, cameraY, cameraZ),
				PREVIEW_SELECTION_VISUAL
			));
		}
	}

	private static void requestSnapshotCapture(SnapshotCaptureRequest request) {
		SNAPSHOT_CAPTURE_SCHEDULER.requestCapture(request);
	}

	private static void tickClient(MinecraftClient client) {
		ensureDesignDaemonBootstrapStarted(client);
		pollDesignDaemonBootstrap(client);
		syncSelectionScope(client);
		updatePreviewTarget(client);
		handleAirSelectionAttackFallback(client);
		handleOpenDesignScreenKey(client);
		handleCandidateSwitching(client);
		pollDesignGeneration(client);
		flushPendingSnapshotCapture(client);
	}

	private static void handleOpenDesignScreenKey(MinecraftClient client) {
		while (openDesignScreenKey != null && openDesignScreenKey.wasPressed()) {
			openDesignGenerationScreen();
		}
	}

	private static void handleCandidateSwitching(MinecraftClient client) {
		if (client.currentScreen != null || activePreviewSession == null) {
			return;
		}

		while (previewCandidate1Key != null && previewCandidate1Key.wasPressed()) {
			switchCandidate(client, 0);
		}
		while (previewCandidate2Key != null && previewCandidate2Key.wasPressed()) {
			switchCandidate(client, 1);
		}
		while (previewCandidate3Key != null && previewCandidate3Key.wasPressed()) {
			switchCandidate(client, 2);
		}
	}

	private static void switchCandidate(MinecraftClient client, int candidateIndex) {
		if (activePreviewSession == null) {
			return;
		}

		activePreviewSession.selectCandidate(candidateIndex);
		announceActiveCandidate(client);
	}

	private static void pollDesignGeneration(MinecraftClient client) {
		if (pendingGenerationFuture == null || !pendingGenerationFuture.isDone()) {
			return;
		}

		CompletableFuture<DesignCandidateResponsePayload> completedFuture = pendingGenerationFuture;
		DesignGenerationLaunch completedLaunch = pendingGenerationLaunch;
		pendingGenerationFuture = null;
		pendingGenerationLaunch = null;

		try {
			DesignCandidateResponsePayload response = completedFuture.join();
			if (response == null || response.candidates() == null || response.candidates().isEmpty()) {
				throw new IllegalStateException("Design daemon returned no candidates.");
			}

			activePreviewSession = DesignPreviewSession.ready(
				response.snapshotId(),
				completedLaunch.profile().id(),
				completedLaunch.profile().label(),
				response.provider() == null ? completedLaunch.profile().model() : response.provider().model(),
				response.candidates()
			);
			announceActiveCandidate(client);
		} catch (CompletionException exception) {
			String message = exception.getCause() == null ? exception.getMessage() : exception.getCause().getMessage();
			if (client.player != null) {
				client.player.sendMessage(Text.literal("MinecraftClaw: design generation failed: " + message), false);
			}
		}
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

		SnapshotCaptureRequest captureRequest = SNAPSHOT_CAPTURE_SCHEDULER.consumePendingCapture();
		if (captureRequest == null) {
			return;
		}

		try {
			PreparedDesignSnapshotCapture preparedCapture = DesignSnapshotCaptureService.prepareCapture(
				client,
				SELECTION_STATE,
				captureRequest.promptContext()
			);
			SELECTION_STATE.clearPreviewTarget();
			EnvironmentCaptureSession session = new EnvironmentCaptureSession(client.player.getYaw(), client.player.getPitch());
			Entity originalCameraEntity = client.getCameraEntity();
			OtherClientPlayerEntity cameraAnchor = new OtherClientPlayerEntity(
				client.world,
				new GameProfile(UUID.randomUUID(), "minecraftclaw_capture")
			);
			activeSnapshotCapture = new ActiveSnapshotCapture(preparedCapture, session, originalCameraEntity, cameraAnchor, captureRequest);
			stageDirection(activeSnapshotCapture, session.stageNextDirection());
			client.player.sendMessage(
				Text.literal(
					"MinecraftClaw: capturing 5 environment screenshots for snapshot " + preparedCapture.snapshot().snapshotId()
				),
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
			clearDesignPreviewState();
			return;
		}

		String nextScopeKey = scope.orElseThrow().key();
		if (nextScopeKey.equals(activeSelectionScopeKey)) {
			return;
		}

		activeSelectionScopeKey = nextScopeKey;
		clearDesignPreviewState();
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
				DesignSnapshotPaths paths = DesignSnapshotCaptureService.writePreparedCapture(activeSnapshotCapture.preparedCapture());
				SELECTION_STATE.setLastSnapshotId(paths.snapshotDirectory().getFileName().toString());
				if (activeSnapshotCapture.request().startsDesignGeneration()) {
					startDesignGeneration(client, paths, activeSnapshotCapture.request().generationLaunch());
				} else {
					client.player.sendMessage(Text.literal("MinecraftClaw: design snapshot written to " + paths.snapshotDirectory()), false);
				}
				activeSnapshotCapture = null;
			}
		} catch (Exception exception) {
			restoreOriginalView(client, activeSnapshotCapture);
			client.player.sendMessage(Text.literal("MinecraftClaw: snapshot capture failed: " + exception.getMessage()), false);
			activeSnapshotCapture = null;
		}
	}

	private static void startDesignGeneration(MinecraftClient client, DesignSnapshotPaths paths, DesignGenerationLaunch launch) {
		client.player.sendMessage(
			Text.literal("MinecraftClaw: snapshot ready, requesting 3 candidates from " + launch.profile().label() + "."),
			false
		);
		pendingGenerationLaunch = launch;
		pendingGenerationFuture = CompletableFuture.supplyAsync(() -> {
			try {
				return designDaemonClient(client).generate(
					DesignGenerationRequestPayload.from(
						launch.profile(),
						paths.snapshotDirectory().toString(),
						paths.snapshotDirectory().getFileName().toString()
					)
				);
			} catch (IOException | InterruptedException exception) {
				throw new CompletionException(exception);
			}
		});
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

	private static void commitFirstCorner(PlayerEntity player, BlockPos pos) {
		clearDesignPreviewState();
		SELECTION_STATE.clearCommittedSelection();
		SELECTION_STATE.setFirstCorner(pos);
		player.sendMessage(Text.literal("MinecraftClaw: first corner set to " + formatPos(pos)), false);
		persistCommittedSelection(MinecraftClient.getInstance());
	}

	private static void commitSecondCorner(PlayerEntity player, BlockPos pos) {
		clearDesignPreviewState();
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
			persistCommittedSelection(MinecraftClient.getInstance());
			openDesignGenerationScreen();
		});
	}

	private static void openDesignGenerationScreen() {
		MinecraftClient client = MinecraftClient.getInstance();
		if (client == null || client.player == null || activeSnapshotCapture != null || SELECTION_STATE.currentSelection().isEmpty()) {
			return;
		}

		ensureModelProfilesLoaded(client);
		client.setScreen(new DesignGenerationScreen());
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
			Path stateDirectory = clientStateDirectory(client);
			selectionPersistence = new SelectionPersistence(stateDirectory);
		}

		return selectionPersistence;
	}

	private static ModelProfileStore modelProfileStore(MinecraftClient client) {
		if (modelProfileStore == null) {
			Path stateDirectory = clientStateDirectory(client);
			modelProfileStore = new ModelProfileStore(stateDirectory);
		}

		return modelProfileStore;
	}

	private static void ensureModelProfilesLoaded(MinecraftClient client) {
		if (client == null || modelProfileStore != null) {
			return;
		}

		try {
			modelProfileConfig = modelProfileStore(client).load();
		} catch (IOException exception) {
			MinecraftClawMod.LOGGER.warn("MinecraftClaw failed to load model profiles", exception);
			modelProfileConfig = ModelProfileConfig.empty();
		}
	}

	private static DesignDaemonClient designDaemonClient(MinecraftClient client) {
		if (designDaemonClient == null) {
			designDaemonClient = new DesignDaemonClient(
				HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build(),
				DESIGN_DAEMON_URI,
				DESIGN_DAEMON_TOKEN
			);
		}

		return designDaemonClient;
	}

	private static DesignDaemonLauncher designDaemonLauncher(MinecraftClient client) {
		if (designDaemonLauncher == null) {
			designDaemonLauncher = new DesignDaemonLauncher(
				designDaemonClient(client),
				new DesignDaemonLauncherConfigStore(clientStateDirectory(client)),
				client.runDirectory.toPath().resolve("minecraftclaw").resolve("logs").resolve("design-daemon.log")
			);
		}

		return designDaemonLauncher;
	}

	private static Path clientStateDirectory(MinecraftClient client) {
		return client.runDirectory.toPath().resolve("minecraftclaw").resolve("client-state");
	}

	private static void clearDesignPreviewState() {
		if (pendingGenerationFuture != null) {
			pendingGenerationFuture.cancel(true);
		}
		pendingGenerationFuture = null;
		pendingGenerationLaunch = null;
		activePreviewSession = null;
	}

	private static void ensureDesignDaemonBootstrapStarted(MinecraftClient client) {
		if (client == null || daemonBootstrapReady || daemonBootstrapFuture != null || daemonBootstrapFailure != null) {
			return;
		}

		daemonBootstrapFuture = CompletableFuture.supplyAsync(() -> {
			try {
				return designDaemonLauncher(client).ensureRunning();
			} catch (IOException | InterruptedException exception) {
				throw new CompletionException(exception);
			}
		});
	}

	private static void pollDesignDaemonBootstrap(MinecraftClient client) {
		if (daemonBootstrapFuture != null && daemonBootstrapFuture.isDone()) {
			try {
				String message = daemonBootstrapFuture.join();
				daemonBootstrapReady = true;
				daemonBootstrapFailure = null;
				MinecraftClawMod.LOGGER.info(message);
			} catch (CompletionException exception) {
				daemonBootstrapReady = false;
				daemonBootstrapFailure = exception.getCause() == null ? exception.getMessage() : exception.getCause().getMessage();
				MinecraftClawMod.LOGGER.warn("MinecraftClaw design daemon bootstrap failed: {}", daemonBootstrapFailure);
			}
			daemonBootstrapFuture = null;
			daemonBootstrapNotified = false;
		}

		if (daemonBootstrapNotified || client == null || client.player == null) {
			return;
		}

		if (daemonBootstrapReady) {
			client.player.sendMessage(Text.literal("MinecraftClaw: design daemon is ready."), false);
			daemonBootstrapNotified = true;
			return;
		}

		if (daemonBootstrapFailure != null) {
			client.player.sendMessage(Text.literal("MinecraftClaw: design daemon bootstrap failed: " + daemonBootstrapFailure), false);
			daemonBootstrapNotified = true;
		}
	}

	private static boolean isDesignGenerationActive() {
		return (activeSnapshotCapture != null && activeSnapshotCapture.request().startsDesignGeneration()) || pendingGenerationFuture != null;
	}

	private static void announceActiveCandidate(MinecraftClient client) {
		if (client.player == null || activePreviewSession == null) {
			return;
		}

		activePreviewSession.activeCandidate().ifPresent((candidate) -> {
			client.player.sendMessage(
				Text.literal(
					"MinecraftClaw: "
						+ activePreviewSession.providerName()
						+ " / "
						+ activePreviewSession.modelName()
						+ " -> "
						+ candidate.title()
				),
				false
			);
			client.player.sendMessage(materialsSummaryText(client.player, candidate), false);
		});
	}

	private static Text materialsSummaryText(PlayerEntity player, DesignCandidatePayload candidate) {
		if (candidate.materialsRequired() == null || candidate.materialsRequired().isEmpty()) {
			return Text.literal("MinecraftClaw: materials summary unavailable.");
		}

		Map<String, Integer> inventory = new LinkedHashMap<>();
		for (int slot = 0; slot < player.getInventory().size(); slot += 1) {
			ItemStack stack = player.getInventory().getStack(slot);
			if (stack.isEmpty()) {
				continue;
			}
			String itemId = Registries.ITEM.getId(stack.getItem()).toString();
			inventory.merge(itemId, stack.getCount(), Integer::sum);
		}

		MutableText text = Text.literal("Materials: ");
		for (int index = 0; index < candidate.materialsRequired().size(); index += 1) {
			DesignCandidatePayload.MaterialRequirementPayload requirement = candidate.materialsRequired().get(index);
			int held = inventory.getOrDefault(requirement.itemId(), 0);
			Formatting formatting = held >= requirement.required() ? Formatting.GREEN : Formatting.RED;
			if (index > 0) {
				text.append(Text.literal(" | ").formatted(Formatting.DARK_GRAY));
			}
			text.append(resolveItemLabel(requirement.itemId()).copy().formatted(formatting));
			text.append(Text.literal(" " + held + "/" + requirement.required()).formatted(formatting));
		}
		return text;
	}

	private static MutableText resolveItemLabel(String itemId) {
		Identifier identifier = Identifier.tryParse(itemId);
		if (identifier == null || !Registries.ITEM.containsId(identifier)) {
			return Text.literal(itemId);
		}

		Item item = Registries.ITEM.get(identifier);
		return Text.translatable(item.getTranslationKey());
	}

	private static String formatPos(BlockPos pos) {
		return pos.getX() + "," + pos.getY() + "," + pos.getZ();
	}

	private static void writeRenderedEnvironmentScreenshot(MinecraftClient client, Path imagePath) throws IOException {
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
		OtherClientPlayerEntity cameraAnchor,
		SnapshotCaptureRequest request
	) {
	}
}
