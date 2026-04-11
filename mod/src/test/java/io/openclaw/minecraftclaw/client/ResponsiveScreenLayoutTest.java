package io.openclaw.minecraftclaw.client;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class ResponsiveScreenLayoutTest {
	@Test
	void designGenerationLayoutShrinksContentWidthOnSmallWindows() {
		ResponsiveScreenLayout.DesignGenerationLayout compact = ResponsiveScreenLayout.designGeneration(320, 240);
		ResponsiveScreenLayout.DesignGenerationLayout regular = ResponsiveScreenLayout.designGeneration(960, 540);

		assertTrue(compact.panelWidth() < regular.panelWidth());
		assertTrue(compact.compactSpacing());
		assertFalse(regular.compactSpacing());
		assertTrue(compact.panelLeft() >= 16);
	}

	@Test
	void modelProfileLayoutStacksActionButtonsOnNarrowWindows() {
		ResponsiveScreenLayout.ModelProfileLayout narrow = ResponsiveScreenLayout.modelProfile(320, 360);
		ResponsiveScreenLayout.ModelProfileLayout wide = ResponsiveScreenLayout.modelProfile(960, 540);

		assertTrue(narrow.stackActionButtons());
		assertFalse(wide.stackActionButtons());
		assertTrue(narrow.panelWidth() < wide.panelWidth());
		assertTrue(narrow.actionButtonWidth() > wide.actionButtonWidth());
	}
}
