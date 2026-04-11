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
	private static final int PANEL_PADDING = 18;

	private final DesignGenerationScreen parent;
	private TextFieldWidget labelField;
	private TextFieldWidget baseUrlField;
	private TextFieldWidget apiKeyField;
	private TextFieldWidget modelField;
	private ButtonWidget enabledButton;
	private ButtonWidget visionButton;
	private ButtonWidget profileButton;
	private List<ModelProfile> profiles = List.of();
	private int selectedProfileIndex;
	private boolean enabled = true;
	private boolean supportsVision;

	public ModelProfileSettingsScreen(DesignGenerationScreen parent) {
		super(Text.literal("Model Profiles"));
		this.parent = parent;
	}

	@Override
	protected void init() {
		super.init();
		syncProfiles();
		ResponsiveScreenLayout.ModelProfileLayout layout = ResponsiveScreenLayout.modelProfile(width, height);
		int contentWidth = layout.panelWidth();
		int left = layout.panelLeft();

		profileButton = addDrawableChild(ButtonWidget.builder(Text.literal("Profile"), (button) -> cycleProfile())
			.dimensions(left, layout.profileButtonY(), contentWidth, 20)
			.build());

		labelField = addField(left, layout.labelFieldY(), contentWidth, "Label");
		baseUrlField = addField(left, layout.baseUrlFieldY(), contentWidth, "Base URL");
		apiKeyField = addField(left, layout.apiKeyFieldY(), contentWidth, "API Key (optional)");
		modelField = addField(left, layout.modelFieldY(), contentWidth, "Model");

		enabledButton = addDrawableChild(ButtonWidget.builder(Text.literal("Enabled"), (button) -> {
			enabled = !enabled;
			updateButtonLabels();
		}).dimensions(left, layout.enabledButtonY(), contentWidth, 20).build());
		visionButton = addDrawableChild(ButtonWidget.builder(Text.literal("Vision Input Disabled"), (button) -> {
			supportsVision = !supportsVision;
			updateButtonLabels();
		}).dimensions(left, layout.visionButtonY(), contentWidth, 20).build());

		if (layout.stackActionButtons()) {
			addDrawableChild(ButtonWidget.builder(Text.literal("New Profile"), (button) -> createNewProfile())
				.dimensions(left, layout.actionRowY(), contentWidth, 20)
				.build());
			addDrawableChild(ButtonWidget.builder(Text.literal("Delete"), (button) -> deleteCurrentProfile())
				.dimensions(left, layout.actionRowY() + 20 + layout.actionButtonGap(), contentWidth, 20)
				.build());
			addDrawableChild(ButtonWidget.builder(Text.literal("Save"), (button) -> saveCurrentProfile())
				.dimensions(left, layout.actionRowY() + 40 + layout.actionButtonGap() * 2, contentWidth, 20)
				.build());
		} else {
			addDrawableChild(ButtonWidget.builder(Text.literal("New Profile"), (button) -> createNewProfile())
				.dimensions(left, layout.actionRowY(), layout.actionButtonWidth(), 20)
				.build());
			addDrawableChild(ButtonWidget.builder(Text.literal("Delete"), (button) -> deleteCurrentProfile())
				.dimensions(left + layout.actionButtonWidth() + layout.actionButtonGap(), layout.actionRowY(), layout.actionButtonWidth(), 20)
				.build());
			addDrawableChild(ButtonWidget.builder(Text.literal("Save"), (button) -> saveCurrentProfile())
				.dimensions(left + (layout.actionButtonWidth() + layout.actionButtonGap()) * 2, layout.actionRowY(), layout.actionButtonWidth(), 20)
				.build());
		}
		addDrawableChild(ButtonWidget.builder(Text.literal("Done"), (button) -> close())
			.dimensions(left, layout.doneButtonY(), contentWidth, 20)
			.build());

		loadProfileIntoFields(currentProfile());
		updateButtonLabels();
		setInitialFocus(labelField);
	}

	@Override
	public void render(DrawContext context, int mouseX, int mouseY, float delta) {
		renderBackground(context);
		int centerX = width / 2;
		ResponsiveScreenLayout.ModelProfileLayout layout = ResponsiveScreenLayout.modelProfile(width, height);
		int contentWidth = layout.panelWidth();
		int left = layout.panelLeft();
		context.fill(left - PANEL_PADDING, layout.panelTop(), left + contentWidth + PANEL_PADDING, layout.panelBottom(), 0xA0141820);
		super.render(context, mouseX, mouseY, delta);
		context.drawCenteredTextWithShadow(textRenderer, title, centerX, layout.panelTop() + 8, 0xFFFFFF);
		context.drawTextWithShadow(textRenderer, Text.literal("Profile"), left, layout.profileLabelY(), 0xD8D8D8);
		context.drawTextWithShadow(textRenderer, Text.literal("Label"), left, layout.labelFieldY() - 12, 0xD8D8D8);
		context.drawTextWithShadow(textRenderer, Text.literal("Base URL"), left, layout.baseUrlFieldY() - 12, 0xD8D8D8);
		context.drawTextWithShadow(textRenderer, Text.literal("API Key (optional)"), left, layout.apiKeyFieldY() - 12, 0xD8D8D8);
		context.drawTextWithShadow(textRenderer, Text.literal("Model"), left, layout.modelFieldY() - 12, 0xD8D8D8);
		context.drawTextWithShadow(textRenderer, Text.literal("Provider: OpenAI-compatible"), left, layout.providerInfoY(), 0xA8A8A8);
		context.drawTextWithShadow(textRenderer, Text.literal("Enabled"), left, layout.enabledLabelY(), 0xD8D8D8);
		context.drawTextWithShadow(textRenderer, Text.literal("Vision Input"), left, layout.visionLabelY(), 0xD8D8D8);
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
				false,
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
			false,
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
			profiles.add(new ModelProfile(createProfileId(), "", ProviderType.OPENAI_COMPATIBLE, "http://127.0.0.1:11434/v1", "", "", false, true));
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
			supportsVision,
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
		supportsVision = profile.supportsVision();
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
		if (visionButton != null) {
			visionButton.setMessage(Text.literal(supportsVision ? "Vision Input Enabled" : "Vision Input Disabled"));
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
