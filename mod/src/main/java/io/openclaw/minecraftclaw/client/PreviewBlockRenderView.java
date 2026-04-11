package io.openclaw.minecraftclaw.client;

import java.util.Map;
import net.minecraft.block.BlockState;
import net.minecraft.block.Blocks;
import net.minecraft.block.entity.BlockEntity;
import net.minecraft.client.world.ClientWorld;
import net.minecraft.fluid.FluidState;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.Direction;
import net.minecraft.world.biome.ColorResolver;
import net.minecraft.world.chunk.light.LightingProvider;

final class PreviewBlockRenderView implements net.minecraft.world.BlockRenderView {
	private final ClientWorld world;
	private final Map<BlockPos, BlockState> previewStates;

	PreviewBlockRenderView(ClientWorld world, Map<BlockPos, BlockState> previewStates) {
		this.world = world;
		this.previewStates = Map.copyOf(previewStates);
	}

	@Override
	public float getBrightness(Direction direction, boolean shaded) {
		return world.getBrightness(direction, shaded);
	}

	@Override
	public LightingProvider getLightingProvider() {
		return world.getLightingProvider();
	}

	@Override
	public int getColor(BlockPos pos, ColorResolver colorResolver) {
		return world.getColor(pos, colorResolver);
	}

	@Override
	public BlockEntity getBlockEntity(BlockPos pos) {
		return null;
	}

	@Override
	public BlockState getBlockState(BlockPos pos) {
		return previewStates.getOrDefault(pos, Blocks.AIR.getDefaultState());
	}

	@Override
	public FluidState getFluidState(BlockPos pos) {
		return getBlockState(pos).getFluidState();
	}

	@Override
	public int getHeight() {
		return world.getHeight();
	}

	@Override
	public int getBottomY() {
		return world.getBottomY();
	}
}
