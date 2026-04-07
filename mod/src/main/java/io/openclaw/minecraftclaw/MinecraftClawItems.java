package io.openclaw.minecraftclaw;

import net.minecraft.item.Item;
import net.minecraft.registry.Registries;
import net.minecraft.registry.Registry;
import net.minecraft.util.Identifier;

public final class MinecraftClawItems {
	public static final Item AETHER_ARCHITECTS_WAND = register(
		"aether_architects_wand",
		new Item(new Item.Settings().maxCount(1))
	);

	private MinecraftClawItems() {
	}

	public static void initialize() {
		// Trigger static init.
	}

	private static Item register(String name, Item item) {
		return Registry.register(Registries.ITEM, new Identifier(MinecraftClawMod.MOD_ID, name), item);
	}
}
