package io.openclaw.minecraftclaw.export;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import net.minecraft.block.BlockState;
import net.minecraft.block.entity.BlockEntity;
import net.minecraft.entity.Entity;
import net.minecraft.entity.LivingEntity;
import net.minecraft.entity.player.PlayerInventory;
import net.minecraft.item.ItemStack;
import net.minecraft.nbt.NbtCompound;
import net.minecraft.registry.Registries;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.Box;
import net.minecraft.world.Heightmap;

public final class RawScanCapture {
	private RawScanCapture() {
	}

	public static RawExportSnapshot capture(ServerPlayerEntity player, RawExportProfile profile, Instant scannedAt) {
		ServerWorld world = player.getServerWorld();
		BlockPos center = player.getBlockPos();
		RawScanRegions regions = RawScanRegions.around(center, profile);

		List<Map<String, Object>> inventory = captureInventory(player.getInventory());
		List<Map<String, Object>> blockEntities = new ArrayList<>();
		List<Map<String, Object>> localBlocks = captureLocalBlocks(world, regions, blockEntities);
		List<Map<String, Object>> entities = captureEntities(player, world, regions);
		List<Map<String, Object>> surfaceMap = captureSurfaceMap(world, regions);

		return new RawExportSnapshot(
			captureScanMeta(player, profile, scannedAt, regions),
			capturePlayerState(player),
			inventory,
			localBlocks,
			blockEntities,
			entities,
			surfaceMap
		);
	}

	private static Map<String, Object> captureScanMeta(
		ServerPlayerEntity player,
		RawExportProfile profile,
		Instant scannedAt,
		RawScanRegions regions
	) {
		Map<String, Object> scanMeta = new LinkedHashMap<>();
		scanMeta.put("schema_version", 1);
		scanMeta.put("scanned_at", scannedAt.toString());
		scanMeta.put("player_name", player.getName().getString());
		scanMeta.put("player_uuid", player.getUuidAsString());
		scanMeta.put("dimension", player.getWorld().getRegistryKey().getValue().toString());
		scanMeta.put("center", blockPos(player.getBlockPos()));
		scanMeta.put("local_bounds", Map.of(
			"min", blockPos(regions.localMin()),
			"max", blockPos(regions.localMax())
		));
		scanMeta.put("surface_bounds", Map.of(
			"min_x", regions.surfaceMinX(),
			"max_x", regions.surfaceMaxX(),
			"min_z", regions.surfaceMinZ(),
			"max_z", regions.surfaceMaxZ()
		));
		scanMeta.put("profile", Map.of(
			"local_width", profile.localWidth(),
			"local_depth", profile.localDepth(),
			"local_height", profile.localHeight(),
			"surface_width", profile.surfaceWidth(),
			"surface_depth", profile.surfaceDepth()
		));
		scanMeta.put("files", profile.fileNames());
		return scanMeta;
	}

	private static Map<String, Object> capturePlayerState(ServerPlayerEntity player) {
		Map<String, Object> playerState = new LinkedHashMap<>();
		playerState.put("player_name", player.getName().getString());
		playerState.put("player_uuid", player.getUuidAsString());
		playerState.put("dimension", player.getWorld().getRegistryKey().getValue().toString());
		playerState.put("block_pos", blockPos(player.getBlockPos()));
		playerState.put("exact_pos", Map.of(
			"x", player.getX(),
			"y", player.getY(),
			"z", player.getZ()
		));
		playerState.put("yaw", player.getYaw());
		playerState.put("pitch", player.getPitch());
		playerState.put("health", player.getHealth());
		playerState.put("food", player.getHungerManager().getFoodLevel());
		playerState.put("saturation", player.getHungerManager().getSaturationLevel());
		playerState.put("on_ground", player.isOnGround());
		playerState.put("main_hand", itemStack(player.getMainHandStack()));
		playerState.put("off_hand", itemStack(player.getOffHandStack()));
		return playerState;
	}

	private static List<Map<String, Object>> captureInventory(PlayerInventory inventory) {
		List<Map<String, Object>> slots = new ArrayList<>();
		for (int slot = 0; slot < inventory.size(); slot++) {
			ItemStack stack = inventory.getStack(slot);
			Map<String, Object> entry = new LinkedHashMap<>();
			entry.put("slot", slot);
			entry.putAll(itemStack(stack));
			slots.add(entry);
		}
		return slots;
	}

	private static List<Map<String, Object>> captureLocalBlocks(
		ServerWorld world,
		RawScanRegions regions,
		List<Map<String, Object>> blockEntities
	) {
		List<Map<String, Object>> blocks = new ArrayList<>();
		for (BlockPos pos : BlockPos.iterate(regions.localMin(), regions.localMax())) {
			BlockState state = world.getBlockState(pos);
			Map<String, Object> entry = new LinkedHashMap<>();
			entry.put("x", pos.getX());
			entry.put("y", pos.getY());
			entry.put("z", pos.getZ());
			entry.put("block_id", Registries.BLOCK.getId(state.getBlock()).toString());
			entry.put("state_string", state.toString());
			entry.put("is_air", state.isAir());
			blocks.add(entry);

			BlockEntity blockEntity = world.getBlockEntity(pos);
			if (blockEntity != null) {
				Map<String, Object> blockEntityEntry = new LinkedHashMap<>();
				blockEntityEntry.put("x", pos.getX());
				blockEntityEntry.put("y", pos.getY());
				blockEntityEntry.put("z", pos.getZ());
				blockEntityEntry.put("block_id", Registries.BLOCK.getId(state.getBlock()).toString());
				blockEntityEntry.put("type", blockEntity.getType().toString());
				blockEntityEntry.put("nbt_snbt", blockEntity.createNbtWithIdentifyingData().toString());
				blockEntities.add(blockEntityEntry);
			}
		}
		return blocks;
	}

	private static List<Map<String, Object>> captureEntities(
		ServerPlayerEntity player,
		ServerWorld world,
		RawScanRegions regions
	) {
		Box box = new Box(
			regions.localMin().getX(),
			regions.localMin().getY(),
			regions.localMin().getZ(),
			regions.localMax().getX() + 1,
			regions.localMax().getY() + 1,
			regions.localMax().getZ() + 1
		);
		List<Map<String, Object>> entities = new ArrayList<>();
		for (Entity entity : world.getOtherEntities(player, box)) {
			Map<String, Object> entry = new LinkedHashMap<>();
			entry.put("uuid", entity.getUuidAsString());
			entry.put("type", Registries.ENTITY_TYPE.getId(entity.getType()).toString());
			entry.put("name", entity.getName().getString());
			entry.put("block_pos", blockPos(entity.getBlockPos()));
			entry.put("exact_pos", Map.of(
				"x", entity.getX(),
				"y", entity.getY(),
				"z", entity.getZ()
			));
			if (entity instanceof LivingEntity livingEntity) {
				entry.put("health", livingEntity.getHealth());
			}
			NbtCompound nbt = new NbtCompound();
			entity.saveNbt(nbt);
			entry.put("nbt_snbt", nbt.toString());
			entities.add(entry);
		}
		return entities;
	}

	private static List<Map<String, Object>> captureSurfaceMap(ServerWorld world, RawScanRegions regions) {
		List<Map<String, Object>> surface = new ArrayList<>();
		for (int x = regions.surfaceMinX(); x <= regions.surfaceMaxX(); x++) {
			for (int z = regions.surfaceMinZ(); z <= regions.surfaceMaxZ(); z++) {
				int topY = world.getTopY(Heightmap.Type.MOTION_BLOCKING_NO_LEAVES, x, z);
				int surfaceY = Math.max(world.getBottomY(), topY - 1);
				BlockPos pos = new BlockPos(x, surfaceY, z);
				BlockState state = world.getBlockState(pos);
				Map<String, Object> entry = new LinkedHashMap<>();
				entry.put("x", x);
				entry.put("z", z);
				entry.put("surface_y", surfaceY);
				entry.put("block_id", Registries.BLOCK.getId(state.getBlock()).toString());
				entry.put("state_string", state.toString());
				surface.add(entry);
			}
		}
		return surface;
	}

	private static Map<String, Object> itemStack(ItemStack stack) {
		Map<String, Object> item = new LinkedHashMap<>();
		item.put("item_id", Registries.ITEM.getId(stack.getItem()).toString());
		item.put("count", stack.getCount());
		item.put("empty", stack.isEmpty());
		item.put("display_name", stack.getName().getString());
		item.put("nbt_snbt", stack.writeNbt(new NbtCompound()).toString());
		return item;
	}

	private static Map<String, Integer> blockPos(BlockPos pos) {
		return Map.of(
			"x", pos.getX(),
			"y", pos.getY(),
			"z", pos.getZ()
		);
	}
}
