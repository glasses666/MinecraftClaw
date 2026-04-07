package io.openclaw.minecraftclaw.snapshot;

import java.util.List;

public record PlayerDesignContext(
	String gameMode,
	List<InventoryCount> inventory
) {
}
