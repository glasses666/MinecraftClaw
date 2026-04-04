package io.openclaw.minecraftclaw.bridge;

import java.util.List;

public record LocalSpaceSnapshot(
	int schemaVersion,
	BridgePlayerSnapshot player,
	LocalSpaceBounds bounds,
	SpaceScanRequest parameters,
	LocalSpaceSummary summary,
	List<LocalSpaceColumn> columns,
	List<WalkableSurface> walkableSurfaces,
	List<SpacePointOfInterest> pointsOfInterest
) {
}

record LocalSpaceBounds(BridgeBlockPosition min, BridgeBlockPosition max) {
}

record LocalSpaceSummary(
	int sampledColumns,
	int sampledBlocks,
	int occupiedBlocks,
	int airBlocks,
	int fluidBlocks,
	int walkableSurfaceCount,
	List<BlockCount> topBlockCounts
) {
}

record BlockCount(String blockId, int count) {
}

record LocalSpaceColumn(
	int x,
	int z,
	Integer highestOccupiedY,
	String topBlockId,
	Integer walkableY,
	Integer headroom,
	List<OccupiedRun> occupiedRuns
) {
}

record OccupiedRun(int startY, int endY, String blockId) {
}

record WalkableSurface(int x, int y, int z, String blockId, int headroom) {
}

record SpacePointOfInterest(String category, String kindId, String label, BridgeBlockPosition position) {
}
