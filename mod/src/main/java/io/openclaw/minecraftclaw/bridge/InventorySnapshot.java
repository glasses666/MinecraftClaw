package io.openclaw.minecraftclaw.bridge;

import java.util.List;

public record InventorySnapshot(String playerName, int selectedHotbarSlot, List<InventorySlot> slots) {
}
