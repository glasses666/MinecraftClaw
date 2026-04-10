package io.openclaw.minecraftclaw.client;

public final class WandInteractionPlanner {
	private WandInteractionPlanner() {
	}

	public static BlockUseIntent resolveBlockUseIntent(boolean isSneaking, boolean hasFirstCorner, boolean hasCompleteSelection) {
		if (isSneaking && hasCompleteSelection) {
			return BlockUseIntent.OPEN_DESIGN_SCREEN;
		}

		if (!hasFirstCorner) {
			return BlockUseIntent.REQUIRE_FIRST_CORNER;
		}

		return BlockUseIntent.SET_SECOND_CORNER;
	}

	public enum BlockUseIntent {
		REQUIRE_FIRST_CORNER,
		SET_SECOND_CORNER,
		OPEN_DESIGN_SCREEN
	}
}
