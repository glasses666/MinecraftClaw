package io.openclaw.minecraftclaw.client;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class WandInteractionPlannerTest {
	@Test
	void blockUseSetsSecondCornerByDefault() {
		assertEquals(
			WandInteractionPlanner.BlockUseIntent.SET_SECOND_CORNER,
			WandInteractionPlanner.resolveBlockUseIntent(false, false)
		);
	}

	@Test
	void blockUseCapturesSnapshotWhenSneakingWithActiveSelection() {
		assertEquals(
			WandInteractionPlanner.BlockUseIntent.CAPTURE_SNAPSHOT,
			WandInteractionPlanner.resolveBlockUseIntent(true, true)
		);
	}

	@Test
	void blockUseStillSetsSecondCornerWhenSneakingWithoutCompleteSelection() {
		assertEquals(
			WandInteractionPlanner.BlockUseIntent.SET_SECOND_CORNER,
			WandInteractionPlanner.resolveBlockUseIntent(true, false)
		);
	}
}
