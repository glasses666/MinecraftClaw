package io.openclaw.minecraftclaw.bridge;

public interface MinecraftClawBridgeController {
	BridgePlayerSnapshot getPlayerState();

	InventorySnapshot getInventory();

	BridgePlayerSnapshot teleportPlayer(TeleportRequest request);

	LocalSpaceSnapshot scanLocalSpace(SpaceScanRequest request);

	BridgeActionResult placeBlock(PlaceBlockRequest request);

	BridgeActionResult fillBox(FillBoxRequest request);

	BridgeActionResult runCommand(CommandRequest request);
}
