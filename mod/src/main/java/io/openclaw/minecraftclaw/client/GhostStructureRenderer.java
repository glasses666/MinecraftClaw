package io.openclaw.minecraftclaw.client;

import com.mojang.brigadier.exceptions.CommandSyntaxException;
import com.mojang.blaze3d.systems.RenderSystem;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import net.minecraft.block.BlockState;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.render.BufferBuilder;
import net.minecraft.client.render.RenderLayer;
import net.minecraft.client.render.VertexConsumer;
import net.minecraft.client.render.VertexConsumerProvider;
import net.minecraft.client.render.block.BlockRenderManager;
import net.minecraft.client.util.math.MatrixStack;
import net.minecraft.command.argument.BlockArgumentParser;
import net.minecraft.registry.RegistryKeys;
import net.minecraft.registry.RegistryWrapper;
import net.minecraft.util.Identifier;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.random.Random;
import io.openclaw.minecraftclaw.selection.SelectionVolume;

public final class GhostStructureRenderer {
	private static final float GHOST_RED = 0.90F;
	private static final float GHOST_GREEN = 0.96F;
	private static final float GHOST_BLUE = 1.00F;
	private static final float GHOST_ALPHA = 0.62F;
	private static final float GHOST_POLYGON_OFFSET_FACTOR = -1.0F;
	private static final float GHOST_POLYGON_OFFSET_UNITS = -0.6F;

	private static RuntimeBlueprintPayload cachedBlueprint;
	private static BlockPos cachedSelectionMin;
	private static Object cachedWorld;
	private static CachedPreview cachedPreview;

	private GhostStructureRenderer() {
	}

	public static void render(
		MatrixStack matrices,
		SelectionVolume selection,
		RuntimeBlueprintPayload blueprint,
		double cameraX,
		double cameraY,
		double cameraZ
	) {
		MinecraftClient client = MinecraftClient.getInstance();
		if (client == null || client.world == null || blueprint == null) {
			return;
		}

		CachedPreview preview = getOrBuildCache(client, selection, blueprint);
		if (preview == null || preview.blocks().isEmpty()) {
			return;
		}

		RenderSystem.enableBlend();
		RenderSystem.defaultBlendFunc();
		RenderSystem.depthMask(false);
		RenderSystem.enablePolygonOffset();
		RenderSystem.polygonOffset(GHOST_POLYGON_OFFSET_FACTOR, GHOST_POLYGON_OFFSET_UNITS);

		VertexConsumerProvider.Immediate immediate = VertexConsumerProvider.immediate(
			new BufferBuilder(RenderLayer.getTranslucentMovingBlock().getExpectedBufferSize())
		);
		VertexConsumer consumer = new TintedVertexConsumer(
			immediate.getBuffer(RenderLayer.getTranslucentMovingBlock()),
			GHOST_RED,
			GHOST_GREEN,
			GHOST_BLUE,
			GHOST_ALPHA
		);
		BlockRenderManager blockRenderManager = client.getBlockRenderManager();
		Random random = Random.create();

		for (ResolvedPreviewBlock block : preview.blocks()) {
			matrices.push();
			matrices.translate(
				block.worldPos().getX() - cameraX,
				block.worldPos().getY() - cameraY,
				block.worldPos().getZ() - cameraZ
			);
			random.setSeed(block.state().getRenderingSeed(block.worldPos()));
			blockRenderManager.renderBlock(
				block.state(),
				block.worldPos(),
				preview.blockView(),
				matrices,
				consumer,
				true,
				random
			);
			matrices.pop();
		}

		immediate.draw(RenderLayer.getTranslucentMovingBlock());
		RenderSystem.polygonOffset(0.0F, 0.0F);
		RenderSystem.disablePolygonOffset();
		RenderSystem.depthMask(true);
		RenderSystem.disableBlend();
	}

	public static void resetCache() {
		cachedBlueprint = null;
		cachedSelectionMin = null;
		cachedWorld = null;
		cachedPreview = null;
	}

	private static CachedPreview getOrBuildCache(MinecraftClient client, SelectionVolume selection, RuntimeBlueprintPayload blueprint) {
		if (cachedPreview != null
			&& cachedBlueprint == blueprint
			&& selection.min().equals(cachedSelectionMin)
			&& client.world == cachedWorld) {
			return cachedPreview;
		}

		List<PreviewVoxel> compiled = CandidatePreviewCompiler.compile(blueprint);
		List<ResolvedPreviewBlock> resolvedBlocks = new ArrayList<>(compiled.size());
		Map<BlockPos, BlockState> states = new HashMap<>();
		RegistryWrapper.Impl<net.minecraft.block.Block> blockRegistry = client.world.getRegistryManager().getWrapperOrThrow(RegistryKeys.BLOCK);

		for (PreviewVoxel voxel : compiled) {
			BlockPos worldPos = selection.min().add(voxel.x(), voxel.y(), voxel.z());
			BlockState state = resolveBlockState(blockRegistry, voxel);
			resolvedBlocks.add(new ResolvedPreviewBlock(worldPos.toImmutable(), state));
			states.put(worldPos.toImmutable(), state);
		}

		cachedBlueprint = blueprint;
		cachedSelectionMin = selection.min().toImmutable();
		cachedWorld = client.world;
		cachedPreview = new CachedPreview(resolvedBlocks, new PreviewBlockRenderView(client.world, states));
		return cachedPreview;
	}

	private static BlockState resolveBlockState(RegistryWrapper.Impl<net.minecraft.block.Block> blockRegistry, PreviewVoxel voxel) {
		try {
			return BlockArgumentParser.block(blockRegistry, voxel.blockSpec(), false).blockState();
		} catch (CommandSyntaxException ignored) {
			Identifier identifier = Identifier.tryParse(voxel.blockId());
			if (identifier == null) {
				return net.minecraft.block.Blocks.BARRIER.getDefaultState();
			}

			return net.minecraft.registry.Registries.BLOCK.getOrEmpty(identifier)
				.map((block) -> block.getDefaultState())
				.orElse(net.minecraft.block.Blocks.BARRIER.getDefaultState());
		}
	}

	private record CachedPreview(
		List<ResolvedPreviewBlock> blocks,
		PreviewBlockRenderView blockView
	) {
	}

	private record ResolvedPreviewBlock(
		BlockPos worldPos,
		BlockState state
	) {
	}

	private static final class TintedVertexConsumer implements VertexConsumer {
		private final VertexConsumer delegate;
		private final float redMultiplier;
		private final float greenMultiplier;
		private final float blueMultiplier;
		private final float alphaMultiplier;

		private TintedVertexConsumer(VertexConsumer delegate, float redMultiplier, float greenMultiplier, float blueMultiplier, float alphaMultiplier) {
			this.delegate = delegate;
			this.redMultiplier = redMultiplier;
			this.greenMultiplier = greenMultiplier;
			this.blueMultiplier = blueMultiplier;
			this.alphaMultiplier = alphaMultiplier;
		}

		@Override
		public VertexConsumer vertex(double x, double y, double z) {
			delegate.vertex(x, y, z);
			return this;
		}

		@Override
		public VertexConsumer color(int red, int green, int blue, int alpha) {
			delegate.color(
				multiply(red, redMultiplier),
				multiply(green, greenMultiplier),
				multiply(blue, blueMultiplier),
				multiply(alpha, alphaMultiplier)
			);
			return this;
		}

		@Override
		public VertexConsumer texture(float u, float v) {
			delegate.texture(u, v);
			return this;
		}

		@Override
		public VertexConsumer overlay(int u, int v) {
			delegate.overlay(u, v);
			return this;
		}

		@Override
		public VertexConsumer light(int u, int v) {
			delegate.light(u, v);
			return this;
		}

		@Override
		public VertexConsumer normal(float x, float y, float z) {
			delegate.normal(x, y, z);
			return this;
		}

		@Override
		public void next() {
			delegate.next();
		}

		@Override
		public void fixedColor(int red, int green, int blue, int alpha) {
			delegate.fixedColor(
				multiply(red, redMultiplier),
				multiply(green, greenMultiplier),
				multiply(blue, blueMultiplier),
				multiply(alpha, alphaMultiplier)
			);
		}

		@Override
		public void unfixColor() {
			delegate.unfixColor();
		}

		private static int multiply(int value, float multiplier) {
			return Math.max(0, Math.min(255, Math.round(value * multiplier)));
		}
	}
}
