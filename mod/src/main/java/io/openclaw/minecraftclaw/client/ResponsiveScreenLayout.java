package io.openclaw.minecraftclaw.client;

final class ResponsiveScreenLayout {
	private static final int MIN_MARGIN = 16;
	private static final int PANEL_PADDING = 18;
	private static final int FIELD_HEIGHT = 20;
	private static final int MAX_PANEL_WIDTH = 420;
	private static final int MIN_PANEL_WIDTH = 240;

	private ResponsiveScreenLayout() {
	}

	static DesignGenerationLayout designGeneration(int viewportWidth, int viewportHeight) {
		int panelWidth = resolvePanelWidth(viewportWidth);
		boolean compactSpacing = viewportHeight < 420 || viewportWidth < 420;
		int verticalGap = compactSpacing ? 34 : 46;
		int buttonGap = compactSpacing ? 6 : 8;
		int headerTop = Math.max(20, Math.min(44, viewportHeight / 10));
		int left = (viewportWidth - panelWidth) / 2;
		int contentTop = headerTop + 34;
		int profileLabelY = contentTop;
		int profileButtonY = profileLabelY + 12;
		int promptLabelY = contentTop + verticalGap - 12;
		int promptFieldY = contentTop + verticalGap;
		int positiveLabelY = promptLabelY + verticalGap;
		int positiveFieldY = promptFieldY + verticalGap;
		int negativeLabelY = positiveLabelY + verticalGap;
		int negativeFieldY = positiveFieldY + verticalGap;
		int settingsButtonY = negativeFieldY + verticalGap;
		int generateButtonY = settingsButtonY + FIELD_HEIGHT + buttonGap;
		int cancelButtonY = generateButtonY + FIELD_HEIGHT + buttonGap;
		int panelBottom = cancelButtonY + FIELD_HEIGHT + PANEL_PADDING;
		return new DesignGenerationLayout(
			panelWidth,
			left,
			headerTop,
			panelBottom,
			compactSpacing,
			profileLabelY,
			profileButtonY,
			promptLabelY,
			promptFieldY,
			positiveLabelY,
			positiveFieldY,
			negativeLabelY,
			negativeFieldY,
			settingsButtonY,
			generateButtonY,
			cancelButtonY
		);
	}

	static ModelProfileLayout modelProfile(int viewportWidth, int viewportHeight) {
		int panelWidth = resolvePanelWidth(viewportWidth);
		boolean compactSpacing = viewportHeight < 460 || viewportWidth < 420;
		boolean stackActionButtons = panelWidth < 360;
		int verticalGap = compactSpacing ? 36 : 46;
		int buttonGap = compactSpacing ? 6 : 8;
		int headerTop = Math.max(18, Math.min(38, viewportHeight / 12));
		int left = (viewportWidth - panelWidth) / 2;
		int contentTop = headerTop + 34;
		int profileLabelY = contentTop;
		int profileButtonY = profileLabelY + 12;
		int labelFieldY = contentTop + verticalGap;
		int baseUrlFieldY = labelFieldY + verticalGap;
		int apiKeyFieldY = baseUrlFieldY + verticalGap;
		int modelFieldY = apiKeyFieldY + verticalGap;
		int providerInfoY = modelFieldY + 28;
		int enabledLabelY = providerInfoY + 10;
		int enabledButtonY = enabledLabelY + 12;
		int visionLabelY = enabledButtonY + verticalGap - 10;
		int visionButtonY = visionLabelY + 12;
		int actionRowY = visionButtonY + verticalGap;
		int actionButtonWidth = stackActionButtons ? panelWidth : (panelWidth - 16) / 3;
		int doneButtonY = actionRowY + (stackActionButtons ? (FIELD_HEIGHT * 3 + buttonGap * 2) : FIELD_HEIGHT) + buttonGap;
		int panelBottom = doneButtonY + FIELD_HEIGHT + PANEL_PADDING;

		return new ModelProfileLayout(
			panelWidth,
			left,
			headerTop,
			panelBottom,
			compactSpacing,
			stackActionButtons,
			actionButtonWidth,
			buttonGap,
			profileLabelY,
			profileButtonY,
			labelFieldY,
			baseUrlFieldY,
			apiKeyFieldY,
			modelFieldY,
			providerInfoY,
			enabledLabelY,
			enabledButtonY,
			visionLabelY,
			visionButtonY,
			actionRowY,
			doneButtonY
		);
	}

	private static int resolvePanelWidth(int viewportWidth) {
		return Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, viewportWidth - MIN_MARGIN * 2));
	}

	record DesignGenerationLayout(
		int panelWidth,
		int panelLeft,
		int panelTop,
		int panelBottom,
		boolean compactSpacing,
		int profileLabelY,
		int profileButtonY,
		int promptLabelY,
		int promptFieldY,
		int positiveLabelY,
		int positiveFieldY,
		int negativeLabelY,
		int negativeFieldY,
		int settingsButtonY,
		int generateButtonY,
		int cancelButtonY
	) {
		int panelRight() {
			return panelLeft + panelWidth;
		}
	}

	record ModelProfileLayout(
		int panelWidth,
		int panelLeft,
		int panelTop,
		int panelBottom,
		boolean compactSpacing,
		boolean stackActionButtons,
		int actionButtonWidth,
		int actionButtonGap,
		int profileLabelY,
		int profileButtonY,
		int labelFieldY,
		int baseUrlFieldY,
		int apiKeyFieldY,
		int modelFieldY,
		int providerInfoY,
		int enabledLabelY,
		int enabledButtonY,
		int visionLabelY,
		int visionButtonY,
		int actionRowY,
		int doneButtonY
	) {
		int panelRight() {
			return panelLeft + panelWidth;
		}
	}
}
