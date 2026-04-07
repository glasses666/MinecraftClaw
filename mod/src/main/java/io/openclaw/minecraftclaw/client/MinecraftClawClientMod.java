package io.openclaw.minecraftclaw.client;

import com.mojang.blaze3d.systems.RenderSystem;
import io.openclaw.minecraftclaw.MinecraftClawItems;
import io.openclaw.minecraftclaw.snapshot.DesignSnapshotCaptureService;
import io.openclaw.minecraftclaw.selection.SelectionLimits;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.rendering.v1.WorldRenderContext;
import net.fabricmc.fabric.api.client.rendering.v1.WorldRenderEvents;
import net.fabricmc.fabric.api.event.player.AttackBlockCallback;
import net.fabricmc.fabric.api.event.player.UseBlockCallback;
import net.fabricmc.fabric.api.event.player.UseItemCallback;
import net.minecraft.client.MinecraftClient;
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
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.Box;

public final class MinecraftClawClientMod implements ClientModInitializer {
	private static final SelectionState SELECTION_STATE = new SelectionState();

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

			MinecraftClient client = MinecraftClient.getInstance();
			try {
				var paths = DesignSnapshotCaptureService.capture(client, SELECTION_STATE);
				SELECTION_STATE.setLastSnapshotId(paths.snapshotDirectory().getFileName().toString());
				player.sendMessage(Text.literal("MinecraftClaw: design snapshot written to " + paths.snapshotDirectory()), false);
				return TypedActionResult.fail(stack);
			} catch (Exception exception) {
				player.sendMessage(Text.literal("MinecraftClaw: snapshot capture failed: " + exception.getMessage()), false);
				return TypedActionResult.fail(stack);
			}
		});

		WorldRenderEvents.LAST.register(MinecraftClawClientMod::renderSelectionFrame);
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
}
