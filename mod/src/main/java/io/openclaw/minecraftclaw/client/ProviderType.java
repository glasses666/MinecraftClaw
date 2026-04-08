package io.openclaw.minecraftclaw.client;

public enum ProviderType {
	OPENAI_COMPATIBLE("openai-compatible");

	private final String serializedName;

	ProviderType(String serializedName) {
		this.serializedName = serializedName;
	}

	public String serializedName() {
		return serializedName;
	}

	public static ProviderType fromSerializedName(String value) {
		for (ProviderType providerType : values()) {
			if (providerType.serializedName.equalsIgnoreCase(value)) {
				return providerType;
			}
		}

		throw new IllegalArgumentException("Unsupported providerType: " + value);
	}
}
