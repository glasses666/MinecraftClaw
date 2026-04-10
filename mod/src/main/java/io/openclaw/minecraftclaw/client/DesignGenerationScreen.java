package io.openclaw.minecraftclaw.client;

import io.openclaw.minecraftclaw.selection.SelectionVolume;
import java.util.List;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.client.gui.widget.TextFieldWidget;
import net.minecraft.text.Text;

public final class DesignGenerationScreen extends Screen {
	private static final int PANEL_TOP = 44;
	private static final int PANEL_PADDING = 18;
	private static final int LABEL_TO_FIELD_GAP = 12;
	private static final int FIELD_GAP = 46;

	private TextFieldWidget promptField;
	private TextFieldWidget positivePromptField;
	private TextFieldWidget negativePromptField;
	private ButtonWidget profileButton;
	private ButtonWidget generateButton;
	private int selectedProfileIndex;

	public DesignGenerationScreen() {
		super(Text.literal("MinecraftClaw Design"));
	}

	@Override
	protected void init() {
		super.init();
		refreshFromStore();

		int centerX = width / 2;
		int contentWidth = Math.min(360, width - 56);
		int left = centerX - contentWidth / 2;
		int top = PANEL_TOP + 34;

		profileButton = addDrawableChild(ButtonWidget.builder(Text.literal("Profile"), (button) -> cycleProfile())
			.dimensions(left, top + LABEL_TO_FIELD_GAP, contentWidth, 20)
			.build());

		promptField = new TextFieldWidget(textRenderer, left, top + FIELD_GAP, contentWidth, 20, Text.literal("Prompt"));
		promptField.setMaxLength(512);
		promptField.setPlaceholder(Text.literal("Prompt"));
		promptField.setChangedListener((value) -> updateButtonLabels());
		addSelectableChild(promptField);

		positivePromptField = new TextFieldWidget(textRenderer, left, top + FIELD_GAP + 46, contentWidth, 20, Text.literal("Positive Prompt"));
		positivePromptField.setMaxLength(512);
		positivePromptField.setPlaceholder(Text.literal("Positive prompt"));
		positivePromptField.setChangedListener((value) -> updateButtonLabels());
		addSelectableChild(positivePromptField);

		negativePromptField = new TextFieldWidget(textRenderer, left, top + FIELD_GAP + 92, contentWidth, 20, Text.literal("Negative Prompt"));
		negativePromptField.setMaxLength(512);
		negativePromptField.setPlaceholder(Text.literal("Negative prompt"));
		negativePromptField.setChangedListener((value) -> updateButtonLabels());
		addSelectableChild(negativePromptField);

		addDrawableChild(ButtonWidget.builder(Text.literal("Profile Settings"), (button) -> client.setScreen(new ModelProfileSettingsScreen(this)))
			.dimensions(left, top + FIELD_GAP + 136, contentWidth, 20)
			.build());
		generateButton = addDrawableChild(ButtonWidget.builder(Text.literal(resolveGenerateLabel()), (button) -> submitGeneration())
			.dimensions(left, top + FIELD_GAP + 170, contentWidth, 20)
			.build());
		addDrawableChild(ButtonWidget.builder(Text.literal("Cancel"), (button) -> close())
			.dimensions(left, top + FIELD_GAP + 196, contentWidth, 20)
			.build());

		updateButtonLabels();
		setInitialFocus(promptField);
	}

	void refreshFromStore() {
		ModelProfileConfig config = MinecraftClawClientMod.currentModelProfileConfig();
		List<ModelProfile> profiles = config.profiles();
		if (profiles.isEmpty()) {
			selectedProfileIndex = 0;
			return;
		}

		String lastUsedProfileId = config.lastUsedProfileId();
		if (lastUsedProfileId == null) {
			selectedProfileIndex = clampProfileIndex(selectedProfileIndex, profiles.size());
			return;
		}

		for (int index = 0; index < profiles.size(); index += 1) {
			if (profiles.get(index).id().equals(lastUsedProfileId)) {
				selectedProfileIndex = index;
				return;
			}
		}

		selectedProfileIndex = clampProfileIndex(selectedProfileIndex, profiles.size());
	}

	@Override
	public void render(DrawContext context, int mouseX, int mouseY, float delta) {
		renderBackground(context);
		int centerX = width / 2;
		int contentWidth = Math.min(360, width - 56);
		int left = centerX - contentWidth / 2;
		int top = PANEL_TOP + 34;
		int panelBottom = top + FIELD_GAP + 224;
		context.fill(left - PANEL_PADDING, PANEL_TOP, left + contentWidth + PANEL_PADDING, panelBottom, 0xA0141820);
		super.render(context, mouseX, mouseY, delta);
		context.drawCenteredTextWithShadow(textRenderer, title, centerX, PANEL_TOP + 8, 0xFFFFFF);
		context.drawCenteredTextWithShadow(textRenderer, Text.literal(selectionSummary()), centerX, PANEL_TOP + 20, 0xD0D0D0);
		context.drawTextWithShadow(textRenderer, Text.literal("Selected model profile"), left, top, 0xD8D8D8);
		context.drawTextWithShadow(textRenderer, Text.literal("Prompt"), left, top + FIELD_GAP - LABEL_TO_FIELD_GAP, 0xD8D8D8);
		context.drawTextWithShadow(textRenderer, Text.literal("Positive prompt"), left, top + FIELD_GAP + 34, 0xD8D8D8);
		context.drawTextWithShadow(textRenderer, Text.literal("Negative prompt"), left, top + FIELD_GAP + 80, 0xD8D8D8);
		promptField.render(context, mouseX, mouseY, delta);
		positivePromptField.render(context, mouseX, mouseY, delta);
		negativePromptField.render(context, mouseX, mouseY, delta);
	}

	@Override
	public boolean shouldPause() {
		return false;
	}

	private void cycleProfile() {
		List<ModelProfile> profiles = MinecraftClawClientMod.currentModelProfileConfig().profiles();
		if (profiles.isEmpty()) {
			return;
		}

		selectedProfileIndex = (selectedProfileIndex + 1) % profiles.size();
		updateButtonLabels();
	}

	private void submitGeneration() {
		ModelProfile profile = selectedProfile();
		if (profile == null) {
			return;
		}

		boolean submitted = MinecraftClawClientMod.submitDesignGeneration(
			profile,
			new DesignPromptInputs(
				promptField.getText().trim(),
				positivePromptField.getText().trim(),
				negativePromptField.getText().trim(),
				3
			)
		);
		if (submitted) {
			close();
		}
	}

	private void updateButtonLabels() {
		if (profileButton != null) {
			ModelProfile profile = selectedProfile();
			profileButton.setMessage(Text.literal(profile == null ? "No profiles configured" : formatProfileLabel(profile)));
		}
		if (generateButton != null) {
			generateButton.setMessage(Text.literal(resolveGenerateLabel()));
			generateButton.active = selectedProfile() != null && !promptFieldEmpty();
		}
	}

	private String resolveGenerateLabel() {
		return MinecraftClawClientMod.hasActivePreviewSession() ? "Regenerate" : "Generate";
	}

	private boolean promptFieldEmpty() {
		return promptField == null || promptField.getText().trim().isEmpty();
	}

	private ModelProfile selectedProfile() {
		List<ModelProfile> profiles = MinecraftClawClientMod.currentModelProfileConfig().profiles();
		if (profiles.isEmpty()) {
			return null;
		}

		return profiles.get(clampProfileIndex(selectedProfileIndex, profiles.size()));
	}

	private String selectionSummary() {
		return MinecraftClawClientMod.currentSelection()
			.map((selection) -> "Selection: " + selection.width() + " x " + selection.height() + " x " + selection.depth())
			.orElse("Selection: unavailable");
	}

	private static int clampProfileIndex(int index, int size) {
		if (size <= 0) {
			return 0;
		}

		return Math.max(0, Math.min(index, size - 1));
	}

	private static String formatProfileLabel(ModelProfile profile) {
		String label = profile.label().isBlank() ? "Unnamed profile" : profile.label();
		String model = profile.model().isBlank() ? "model unset" : profile.model();
		return label + " [" + model + "]";
	}
}
