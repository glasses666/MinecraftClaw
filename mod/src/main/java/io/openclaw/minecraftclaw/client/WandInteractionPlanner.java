package io.openclaw.minecraftclaw.client;

public final class WandInteractionPlanner {
	private WandInteractionPlanner() {
	}

	public static BlockUseIntent resolveBlockUseIntent(boolean isSneaking, boolean hasCompleteSelection) {
		if (isSneaking && hasCompleteSelection) {
			return BlockUseIntent.CAPTURE_SNAPSHOT;
		}

		return BlockUseIntent.SET_SECOND_CORNER;
	}

	public enum BlockUseIntent {
		SET_SECOND_CORNER,
		CAPTURE_SNAPSHOT
	}
}
