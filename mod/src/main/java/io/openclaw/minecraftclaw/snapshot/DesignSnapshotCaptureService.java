package io.openclaw.minecraftclaw.snapshot;

import io.openclaw.minecraftclaw.client.SelectionState;
import io.openclaw.minecraftclaw.selection.SelectionLimits;
import io.openclaw.minecraftclaw.selection.SelectionVolume;
import java.io.IOException;
import java.nio.file.Path;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.block.BlockState;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.network.ClientPlayerInteractionManager;
import net.minecraft.client.network.ClientPlayerEntity;
import net.minecraft.client.world.ClientWorld;
import net.minecraft.item.BlockItem;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.registry.Registries;
import net.minecraft.SharedConstants;
import net.minecraft.util.Identifier;
import net.minecraft.util.math.BlockPos;

public final class DesignSnapshotCaptureService {
	private static final DateTimeFormatter SNAPSHOT_TIMESTAMP =
		DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'").withZone(ZoneOffset.UTC);

	private DesignSnapshotCaptureService() {
	}

	public static DesignSnapshotPaths capture(MinecraftClient client, SelectionState selectionState) throws IOException {
		ClientPlayerEntity player = requirePlayer(client);
		ClientWorld world = requireWorld(client);
		SelectionVolume selection = selectionState.currentSelection()
			.orElseThrow(() -> new IllegalStateException("Select two corners with the wand before capturing a snapshot."));

		SelectionLimits limits = SelectionLimits.defaultLimits();
		if (!limits.isWithinHardLimit(selection)) {
			throw new IllegalStateException("The selected volume exceeds the hard limit.");
		}

		String snapshotId = SNAPSHOT_TIMESTAMP.format(Instant.now()) + "-" + sanitizePlayerName(player.getName().getString());
		PaletteMapper paletteMapper = new PaletteMapper();
		List<DesignSlice> slices = captureSlices(world, selection, paletteMapper);

		DesignSnapshot snapshot = new DesignSnapshot(
			snapshotId,
			selection,
			new DesignPromptContext("", "", "", 3),
			new DesignSpaceContext(slices, paletteMapper.legend()),
			new EnvironmentViews(captureEnvironmentViews(world, selection, paletteMapper)),
			new PlayerDesignContext(resolveGameMode(client.interactionManager), captureInventory(player)),
			new GameDesignContext(SharedConstants.getGameVersion().getName(), captureMods()),
			new PaletteCatalog(capturePaletteCatalog())
		);

		Path root = client.runDirectory.toPath().resolve("minecraftclaw").resolve("design-snapshots");
		return DesignSnapshotWriter.write(root, snapshot);
	}

	private static List<DesignSlice> captureSlices(ClientWorld world, SelectionVolume selection, PaletteMapper paletteMapper) {
		List<DesignSlice> slices = new ArrayList<>();

		for (int y = selection.min().getY(); y <= selection.max().getY(); y += 1) {
			List<String> rows = new ArrayList<>();
			for (int z = selection.min().getZ(); z <= selection.max().getZ(); z += 1) {
				List<String> tokens = new ArrayList<>();
				for (int x = selection.min().getX(); x <= selection.max().getX(); x += 1) {
					BlockState state = world.getBlockState(new BlockPos(x, y, z));
					tokens.add(paletteMapper.tokenFor(state));
				}
				rows.add(String.join(" ", tokens));
			}
			slices.add(new DesignSlice(y - selection.min().getY(), List.copyOf(rows)));
		}

		return List.copyOf(slices);
	}

	private static List<EnvironmentView> captureEnvironmentViews(
		ClientWorld world,
		SelectionVolume selection,
		PaletteMapper paletteMapper
	) {
		return List.of(
			captureDirectionalView(world, selection, paletteMapper, "north", 0, -1),
			captureDirectionalView(world, selection, paletteMapper, "east", 1, 0),
			captureDirectionalView(world, selection, paletteMapper, "south", 0, 1),
			captureDirectionalView(world, selection, paletteMapper, "west", -1, 0)
		);
	}

	private static EnvironmentView captureDirectionalView(
		ClientWorld world,
		SelectionVolume selection,
		PaletteMapper paletteMapper,
		String direction,
		int stepX,
		int stepZ
	) {
		Map<String, Integer> tokens = new LinkedHashMap<>();
		int openness = 0;

		int edgeMinX = stepX > 0 ? selection.max().getX() + 1 : selection.min().getX() - 6;
		int edgeMaxX = stepX > 0 ? selection.max().getX() + 6 : selection.min().getX() - 1;
		int edgeMinZ = stepZ > 0 ? selection.max().getZ() + 1 : selection.min().getZ() - 6;
		int edgeMaxZ = stepZ > 0 ? selection.max().getZ() + 6 : selection.min().getZ() - 1;

		if (stepX == 0) {
			edgeMinX = selection.min().getX();
			edgeMaxX = selection.max().getX();
		}

		if (stepZ == 0) {
			edgeMinZ = selection.min().getZ();
			edgeMaxZ = selection.max().getZ();
		}

		for (int x = Math.min(edgeMinX, edgeMaxX); x <= Math.max(edgeMinX, edgeMaxX); x += 1) {
			for (int z = Math.min(edgeMinZ, edgeMaxZ); z <= Math.max(edgeMinZ, edgeMaxZ); z += 1) {
				int topY = highestOccupiedY(world, x, z, selection.max().getY() + 12, selection.min().getY() - 8);
				if (topY < selection.min().getY()) {
					openness += 1;
					continue;
				}
				String token = paletteMapper.tokenFor(world.getBlockState(new BlockPos(x, topY, z)));
				tokens.merge(token, 1, Integer::sum);
			}
		}

		String dominant = tokens.entrySet().stream()
			.sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
			.limit(3)
			.map(Map.Entry::getKey)
			.reduce((left, right) -> left + ", " + right)
			.orElse(".");

		return new EnvironmentView(
			direction,
			"dominant tokens: " + dominant + "; openness score: " + openness
		);
	}

	private static int highestOccupiedY(ClientWorld world, int x, int z, int topY, int bottomY) {
		for (int y = topY; y >= bottomY; y -= 1) {
			BlockState state = world.getBlockState(new BlockPos(x, y, z));
			if (!state.isAir()) {
				return y;
			}
		}
		return bottomY - 1;
	}

	private static List<InventoryCount> captureInventory(ClientPlayerEntity player) {
		Map<String, Integer> counts = new LinkedHashMap<>();
		for (int slot = 0; slot < player.getInventory().size(); slot += 1) {
			ItemStack stack = player.getInventory().getStack(slot);
			if (stack.isEmpty()) {
				continue;
			}

			String itemId = Registries.ITEM.getId(stack.getItem()).toString();
			counts.merge(itemId, stack.getCount(), Integer::sum);
		}

		return counts.entrySet().stream()
			.map((entry) -> new InventoryCount(entry.getKey(), entry.getValue()))
			.toList();
	}

	private static List<ModInfo> captureMods() {
		return FabricLoader.getInstance().getAllMods().stream()
			.map((container) -> new ModInfo(container.getMetadata().getId(), container.getMetadata().getVersion().getFriendlyString()))
			.sorted(Comparator.comparing(ModInfo::id))
			.toList();
	}

	private static List<PaletteCatalogEntry> capturePaletteCatalog() {
		List<PaletteCatalogEntry> entries = new ArrayList<>();
		int index = 1;

		for (Item item : Registries.ITEM) {
			if (!(item instanceof BlockItem)) {
				continue;
			}

			String token = "P" + index++;
			String itemId = Registries.ITEM.getId(item).toString();
			entries.add(new PaletteCatalogEntry(token, itemId, classifyBlockItem(itemId)));
		}

		return entries;
	}

	private static String classifyBlockItem(String itemId) {
		String normalized = itemId.toLowerCase(Locale.ROOT);

		if (normalized.contains("glass")) {
			return "glass_like";
		}
		if (normalized.contains("lantern") || normalized.contains("torch") || normalized.contains("candle") || normalized.contains("campfire")) {
			return "lighting_like";
		}
		if (normalized.contains("planks") || normalized.contains("wood") || normalized.contains("log") || normalized.contains("slab")
			|| normalized.contains("stairs") || normalized.contains("door") || normalized.contains("trapdoor") || normalized.contains("fence")) {
			return "wood_like";
		}
		if (normalized.contains("stone") || normalized.contains("deepslate") || normalized.contains("cobble") || normalized.contains("brick")
			|| normalized.contains("andesite") || normalized.contains("diorite") || normalized.contains("granite")
			|| normalized.contains("tuff") || normalized.contains("travertine")) {
			return "stone_like";
		}
		if (normalized.contains("grass") || normalized.contains("dirt") || normalized.contains("sand") || normalized.contains("leaf")
			|| normalized.contains("flower") || normalized.contains("moss")) {
			return "natural_like";
		}
		return "misc";
	}

	private static String resolveGameMode(ClientPlayerInteractionManager interactionManager) {
		if (interactionManager == null || interactionManager.getCurrentGameMode() == null) {
			return "unknown";
		}
		return interactionManager.getCurrentGameMode().getName();
	}

	private static ClientPlayerEntity requirePlayer(MinecraftClient client) {
		return Optional.ofNullable(client.player)
			.orElseThrow(() -> new IllegalStateException("Client player is not available."));
	}

	private static ClientWorld requireWorld(MinecraftClient client) {
		return Optional.ofNullable(client.world)
			.orElseThrow(() -> new IllegalStateException("Client world is not available."));
	}

	private static String sanitizePlayerName(String playerName) {
		String normalized = playerName.toLowerCase(Locale.ROOT).trim().replaceAll("[^a-z0-9]+", "-");
		String collapsed = normalized.replaceAll("^-+|-+$", "");
		return collapsed.isEmpty() ? "player" : collapsed;
	}

	private static final class PaletteMapper {
		private final Map<String, String> blockIdToToken = new LinkedHashMap<>();
		private final Map<String, PaletteLegendEntry> legend = new LinkedHashMap<>();
		private final Map<String, Integer> categoryCounters = new LinkedHashMap<>();

		private PaletteMapper() {
			legend.put(".", new PaletteLegendEntry(".", "air", List.of("minecraft:air")));
		}

		private String tokenFor(BlockState state) {
			if (state.isAir()) {
				return ".";
			}

			String blockId = Registries.BLOCK.getId(state.getBlock()).toString();
			return blockIdToToken.computeIfAbsent(blockId, (ignored) -> {
				String category = tokenPrefix(blockId);
				int next = categoryCounters.merge(category, 1, Integer::sum);
				String token = category + next;
				legend.put(token, new PaletteLegendEntry(token, blockId, List.of(blockId)));
				return token;
			});
		}

		private Map<String, PaletteLegendEntry> legend() {
			return Map.copyOf(legend);
		}

		private static String tokenPrefix(String blockId) {
			String normalized = blockId.toLowerCase(Locale.ROOT);
			if (normalized.contains("glass")) {
				return "G";
			}
			if (normalized.contains("lantern") || normalized.contains("torch") || normalized.contains("candle") || normalized.contains("campfire")) {
				return "L";
			}
			if (normalized.contains("planks") || normalized.contains("wood") || normalized.contains("log") || normalized.contains("slab")
				|| normalized.contains("stairs") || normalized.contains("door") || normalized.contains("trapdoor") || normalized.contains("fence")) {
				return "W";
			}
			if (normalized.contains("stone") || normalized.contains("deepslate") || normalized.contains("cobble") || normalized.contains("brick")
				|| normalized.contains("andesite") || normalized.contains("diorite") || normalized.contains("granite")
				|| normalized.contains("tuff") || normalized.contains("travertine")) {
				return "S";
			}
			if (normalized.contains("grass") || normalized.contains("dirt") || normalized.contains("sand") || normalized.contains("leaf")
				|| normalized.contains("flower") || normalized.contains("moss") || normalized.contains("water")) {
				return "N";
			}
			return "M";
		}
	}
}
