package io.openclaw.minecraftclaw.client;

import io.openclaw.minecraftclaw.selection.SelectionVolume;
import java.util.List;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.client.gui.widget.TextFieldWidget;
import net.minecraft.text.Text;

public final class DesignGenerationScreen extends Screen {
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
		int contentWidth = Math.min(320, width - 40);
		int left = centerX - contentWidth / 2;
		int top = 48;

		profileButton = addDrawableChild(ButtonWidget.builder(Text.literal("Profile"), (button) -> cycleProfile())
			.dimensions(left, top, contentWidth, 20)
			.build());

		promptField = new TextFieldWidget(textRenderer, left, top + 36, contentWidth, 20, Text.literal("Prompt"));
		promptField.setMaxLength(512);
		promptField.setPlaceholder(Text.literal("Prompt"));
		promptField.setChangedListener((value) -> updateButtonLabels());
		addSelectableChild(promptField);

		positivePromptField = new TextFieldWidget(textRenderer, left, top + 72, contentWidth, 20, Text.literal("Positive Prompt"));
		positivePromptField.setMaxLength(512);
		positivePromptField.setPlaceholder(Text.literal("Positive prompt"));
		positivePromptField.setChangedListener((value) -> updateButtonLabels());
		addSelectableChild(positivePromptField);

		negativePromptField = new TextFieldWidget(textRenderer, left, top + 108, contentWidth, 20, Text.literal("Negative Prompt"));
		negativePromptField.setMaxLength(512);
		negativePromptField.setPlaceholder(Text.literal("Negative prompt"));
		negativePromptField.setChangedListener((value) -> updateButtonLabels());
		addSelectableChild(negativePromptField);

		addDrawableChild(ButtonWidget.builder(Text.literal("Profile Settings"), (button) -> client.setScreen(new ModelProfileSettingsScreen(this)))
			.dimensions(left, top + 144, contentWidth, 20)
			.build());
		generateButton = addDrawableChild(ButtonWidget.builder(Text.literal(resolveGenerateLabel()), (button) -> submitGeneration())
			.dimensions(left, top + 178, contentWidth, 20)
			.build());
		addDrawableChild(ButtonWidget.builder(Text.literal("Cancel"), (button) -> close())
			.dimensions(left, top + 204, contentWidth, 20)
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
		super.render(context, mouseX, mouseY, delta);
		int centerX = width / 2;
		context.drawCenteredTextWithShadow(textRenderer, title, centerX, 20, 0xFFFFFF);
		context.drawTextWithShadow(textRenderer, Text.literal(selectionSummary()), centerX - 160, 32, 0xD0D0D0);
		context.drawTextWithShadow(textRenderer, Text.literal("Selected model profile"), centerX - 160, 54, 0xAFAFAF);
		context.drawTextWithShadow(textRenderer, Text.literal("Prompt"), centerX - 160, 76, 0xAFAFAF);
		context.drawTextWithShadow(textRenderer, Text.literal("Positive prompt"), centerX - 160, 112, 0xAFAFAF);
		context.drawTextWithShadow(textRenderer, Text.literal("Negative prompt"), centerX - 160, 148, 0xAFAFAF);
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

		MinecraftClawClientMod.submitDesignGeneration(
			profile,
			new DesignPromptInputs(
				promptField.getText().trim(),
				positivePromptField.getText().trim(),
				negativePromptField.getText().trim(),
				3
			)
		);
		close();
	}

	private void updateButtonLabels() {
		if (profileButton != null) {
			ModelProfile profile = selectedProfile();
			profileButton.setMessage(Text.literal(profile == null ? "No profiles configured" : profile.label() + " [" + profile.model() + "]"));
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
}
