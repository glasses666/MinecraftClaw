package io.openclaw.minecraftclaw.client;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class WandInteractionPlannerTest {
	@Test
	void blockUseRequiresFirstCornerBeforeSettingSecondCorner() {
		assertEquals(
			WandInteractionPlanner.BlockUseIntent.REQUIRE_FIRST_CORNER,
			WandInteractionPlanner.resolveBlockUseIntent(false, false, false)
		);
	}

	@Test
	void blockUseCapturesSnapshotWhenSneakingWithActiveSelection() {
		assertEquals(
			WandInteractionPlanner.BlockUseIntent.CAPTURE_SNAPSHOT,
			WandInteractionPlanner.resolveBlockUseIntent(true, true, true)
		);
	}

	@Test
	void blockUseSetsSecondCornerWhenFirstCornerExists() {
		assertEquals(
			WandInteractionPlanner.BlockUseIntent.SET_SECOND_CORNER,
			WandInteractionPlanner.resolveBlockUseIntent(false, true, false)
		);
	}

	@Test
	void blockUseStillSetsSecondCornerWhenSneakingWithoutCompleteSelection() {
		assertEquals(
			WandInteractionPlanner.BlockUseIntent.SET_SECOND_CORNER,
			WandInteractionPlanner.resolveBlockUseIntent(true, true, false)
		);
	}
}
