package io.openclaw.minecraftclaw.client;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.client.gui.widget.TextFieldWidget;
import net.minecraft.text.Text;

public final class ModelProfileSettingsScreen extends Screen {
	private final DesignGenerationScreen parent;
	private TextFieldWidget labelField;
	private TextFieldWidget baseUrlField;
	private TextFieldWidget apiKeyField;
	private TextFieldWidget modelField;
	private ButtonWidget enabledButton;
	private ButtonWidget profileButton;
	private List<ModelProfile> profiles = List.of();
	private int selectedProfileIndex;
	private boolean enabled = true;

	public ModelProfileSettingsScreen(DesignGenerationScreen parent) {
		super(Text.literal("Model Profiles"));
		this.parent = parent;
	}

	@Override
	protected void init() {
		super.init();
		syncProfiles();

		int centerX = width / 2;
		int contentWidth = Math.min(340, width - 40);
		int left = centerX - contentWidth / 2;
		int top = 46;

		profileButton = addDrawableChild(ButtonWidget.builder(Text.literal("Profile"), (button) -> cycleProfile())
			.dimensions(left, top, contentWidth, 20)
			.build());

		labelField = addField(left, top + 34, contentWidth, "Label");
		baseUrlField = addField(left, top + 68, contentWidth, "Base URL");
		apiKeyField = addField(left, top + 102, contentWidth, "API Key");
		modelField = addField(left, top + 136, contentWidth, "Model");

		enabledButton = addDrawableChild(ButtonWidget.builder(Text.literal("Enabled"), (button) -> {
			enabled = !enabled;
			updateButtonLabels();
		}).dimensions(left, top + 170, contentWidth, 20).build());

		addDrawableChild(ButtonWidget.builder(Text.literal("New Profile"), (button) -> createNewProfile())
			.dimensions(left, top + 198, 108, 20)
			.build());
		addDrawableChild(ButtonWidget.builder(Text.literal("Delete"), (button) -> deleteCurrentProfile())
			.dimensions(left + 116, top + 198, 108, 20)
			.build());
		addDrawableChild(ButtonWidget.builder(Text.literal("Save"), (button) -> saveCurrentProfile())
			.dimensions(left + 232, top + 198, 108, 20)
			.build());
		addDrawableChild(ButtonWidget.builder(Text.literal("Done"), (button) -> close())
			.dimensions(left, top + 226, contentWidth, 20)
			.build());

		loadProfileIntoFields(currentProfile());
		updateButtonLabels();
		setInitialFocus(labelField);
	}

	@Override
	public void render(DrawContext context, int mouseX, int mouseY, float delta) {
		renderBackground(context);
		super.render(context, mouseX, mouseY, delta);
		int centerX = width / 2;
		context.drawCenteredTextWithShadow(textRenderer, title, centerX, 20, 0xFFFFFF);
		context.drawTextWithShadow(textRenderer, Text.literal("Profile"), centerX - 170, 52, 0xAFAFAF);
		context.drawTextWithShadow(textRenderer, Text.literal("Label"), centerX - 170, 86, 0xAFAFAF);
		context.drawTextWithShadow(textRenderer, Text.literal("Provider (OpenAI-compatible)"), centerX - 170, 104, 0x808080);
		context.drawTextWithShadow(textRenderer, Text.literal("Base URL"), centerX - 170, 120, 0xAFAFAF);
		context.drawTextWithShadow(textRenderer, Text.literal("API Key"), centerX - 170, 154, 0xAFAFAF);
		context.drawTextWithShadow(textRenderer, Text.literal("Model"), centerX - 170, 188, 0xAFAFAF);
		context.drawTextWithShadow(textRenderer, Text.literal("Enabled"), centerX - 170, 222, 0xAFAFAF);
		labelField.render(context, mouseX, mouseY, delta);
		baseUrlField.render(context, mouseX, mouseY, delta);
		apiKeyField.render(context, mouseX, mouseY, delta);
		modelField.render(context, mouseX, mouseY, delta);
	}

	@Override
	public void close() {
		parent.refreshFromStore();
		if (client != null) {
			client.setScreen(parent);
		}
	}

	@Override
	public boolean shouldPause() {
		return false;
	}

	private TextFieldWidget addField(int x, int y, int width, String placeholder) {
		TextFieldWidget field = new TextFieldWidget(textRenderer, x, y, width, 20, Text.literal(placeholder));
		field.setMaxLength(512);
		field.setPlaceholder(Text.literal(placeholder));
		addSelectableChild(field);
		return field;
	}

	private void syncProfiles() {
		profiles = new ArrayList<>(MinecraftClawClientMod.currentModelProfileConfig().profiles());
		if (profiles.isEmpty()) {
			profiles = new ArrayList<>(List.of(new ModelProfile(
				createProfileId(),
				"",
				ProviderType.OPENAI_COMPATIBLE,
				"http://127.0.0.1:11434/v1",
				"",
				"",
				true
			)));
			selectedProfileIndex = 0;
			return;
		}

		selectedProfileIndex = Math.max(0, Math.min(selectedProfileIndex, profiles.size() - 1));
	}

	private void cycleProfile() {
		if (profiles.isEmpty()) {
			return;
		}

		saveDraftIntoCurrentProfile();
		selectedProfileIndex = (selectedProfileIndex + 1) % profiles.size();
		loadProfileIntoFields(currentProfile());
		updateButtonLabels();
	}

	private void createNewProfile() {
		saveDraftIntoCurrentProfile();
		profiles = new ArrayList<>(profiles);
		profiles.add(new ModelProfile(
			createProfileId(),
			"",
			ProviderType.OPENAI_COMPATIBLE,
			"http://127.0.0.1:11434/v1",
			"",
			"",
			true
		));
		selectedProfileIndex = profiles.size() - 1;
		loadProfileIntoFields(currentProfile());
		updateButtonLabels();
	}

	private void deleteCurrentProfile() {
		if (profiles.isEmpty()) {
			return;
		}

		profiles = new ArrayList<>(profiles);
		profiles.remove(selectedProfileIndex);
		if (profiles.isEmpty()) {
			profiles.add(new ModelProfile(createProfileId(), "", ProviderType.OPENAI_COMPATIBLE, "http://127.0.0.1:11434/v1", "", "", true));
			selectedProfileIndex = 0;
		} else {
			selectedProfileIndex = Math.max(0, Math.min(selectedProfileIndex, profiles.size() - 1));
		}
		saveProfiles(false);
		loadProfileIntoFields(currentProfile());
		updateButtonLabels();
	}

	private void saveCurrentProfile() {
		saveDraftIntoCurrentProfile();
		saveProfiles(true);
	}

	private void saveDraftIntoCurrentProfile() {
		if (profiles.isEmpty()) {
			return;
		}

		profiles = new ArrayList<>(profiles);
		ModelProfile current = currentProfile();
		profiles.set(selectedProfileIndex, new ModelProfile(
			current.id(),
			labelField.getText().trim(),
			ProviderType.OPENAI_COMPATIBLE,
			baseUrlField.getText().trim(),
			apiKeyField.getText(),
			modelField.getText().trim(),
			enabled
		));
	}

	private void saveProfiles(boolean useSelectedProfileAsDefault) {
		ModelProfileConfig existing = MinecraftClawClientMod.currentModelProfileConfig();
		String lastUsedProfileId = useSelectedProfileAsDefault && currentProfile() != null
			? currentProfile().id()
			: existing.lastUsedProfileId();
		MinecraftClawClientMod.saveModelProfileConfig(new ModelProfileConfig(1, List.copyOf(profiles), lastUsedProfileId));
		syncProfiles();
		updateButtonLabels();
	}

	private void loadProfileIntoFields(ModelProfile profile) {
		if (profile == null) {
			return;
		}

		labelField.setText(profile.label());
		baseUrlField.setText(profile.baseUrl());
		apiKeyField.setText(profile.apiKey());
		modelField.setText(profile.model());
		enabled = profile.enabled();
	}

	private void updateButtonLabels() {
		ModelProfile profile = currentProfile();
		if (profileButton != null) {
			profileButton.setMessage(Text.literal(profile == null ? "Unsaved profile" : resolveProfileLabel(profile)));
		}
		if (enabledButton != null) {
			enabledButton.setMessage(Text.literal(enabled ? "Enabled" : "Disabled"));
		}
	}

	private ModelProfile currentProfile() {
		if (profiles.isEmpty()) {
			return null;
		}

		return profiles.get(Math.max(0, Math.min(selectedProfileIndex, profiles.size() - 1)));
	}

	private static String createProfileId() {
		return "profile-" + UUID.randomUUID().toString().substring(0, 8);
	}

	private static String resolveProfileLabel(ModelProfile profile) {
		return profile.label().isBlank() ? profile.id() : profile.label();
	}
}
