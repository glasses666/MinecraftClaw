package io.openclaw.minecraftclaw.client;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonNull;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.IOException;
import java.io.Reader;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

public final class ModelProfileStore {
	private static final Gson GSON = new GsonBuilder().setPrettyPrinting().disableHtmlEscaping().create();
	private final Path stateFile;

	public ModelProfileStore(Path rootDirectory) {
		this.stateFile = rootDirectory.resolve("model-profiles.json");
	}

	public ModelProfileConfig load() throws IOException {
		if (!Files.exists(stateFile)) {
			return ModelProfileConfig.empty();
		}

		try (Reader reader = Files.newBufferedReader(stateFile, StandardCharsets.UTF_8)) {
			JsonObject root = JsonParser.parseReader(reader).getAsJsonObject();
			int version = root.has("version") ? root.get("version").getAsInt() : 1;
			String lastUsedProfileId = root.has("lastUsedProfileId") && !root.get("lastUsedProfileId").isJsonNull()
				? root.get("lastUsedProfileId").getAsString()
				: null;
			JsonArray profileArray = root.has("profiles") ? root.getAsJsonArray("profiles") : new JsonArray();
			List<ModelProfile> profiles = new ArrayList<>();
			for (JsonElement element : profileArray) {
				JsonObject profile = element.getAsJsonObject();
				profiles.add(new ModelProfile(
					profile.get("id").getAsString(),
					profile.get("label").getAsString(),
					ProviderType.fromSerializedName(profile.get("providerType").getAsString()),
					profile.get("baseUrl").getAsString(),
					profile.get("apiKey").getAsString(),
					profile.get("model").getAsString(),
					profile.has("supportsVision") && profile.get("supportsVision").getAsBoolean(),
					profile.get("enabled").getAsBoolean()
				));
			}

			return new ModelProfileConfig(version, List.copyOf(profiles), lastUsedProfileId);
		}
	}

	public void save(ModelProfileConfig config) throws IOException {
		Files.createDirectories(stateFile.getParent());
		JsonObject root = new JsonObject();
		root.addProperty("version", config.version());
		if (config.lastUsedProfileId() == null) {
			root.add("lastUsedProfileId", JsonNull.INSTANCE);
		} else {
			root.addProperty("lastUsedProfileId", config.lastUsedProfileId());
		}

		JsonArray profiles = new JsonArray();
		for (ModelProfile profile : config.profiles()) {
			JsonObject entry = new JsonObject();
			entry.addProperty("id", profile.id());
			entry.addProperty("label", profile.label());
			entry.addProperty("providerType", profile.providerType().serializedName());
			entry.addProperty("baseUrl", profile.baseUrl());
			entry.addProperty("apiKey", profile.apiKey());
			entry.addProperty("model", profile.model());
			entry.addProperty("supportsVision", profile.supportsVision());
			entry.addProperty("enabled", profile.enabled());
			profiles.add(entry);
		}
		root.add("profiles", profiles);

		try (Writer writer = Files.newBufferedWriter(stateFile, StandardCharsets.UTF_8)) {
			GSON.toJson(root, writer);
		}
	}
}
