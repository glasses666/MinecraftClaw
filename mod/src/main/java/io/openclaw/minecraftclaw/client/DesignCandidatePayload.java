package io.openclaw.minecraftclaw.client;

import java.util.List;
import java.util.Map;

public record DesignCandidatePayload(
	String candidateId,
	String title,
	String description,
	List<String> styleTags,
	VisualBlueprintPayload visualBlueprint,
	RuntimeBlueprintPayload localBlueprintJson,
	List<MaterialRequirementPayload> materialsRequired,
	ValidationPayload validation
) {
	public record VisualBlueprintPayload(
		Map<String, Object> legend,
		List<Map<String, Object>> slices
	) {
	}

	public record MaterialRequirementPayload(
		String itemId,
		int required
	) {
	}

	public record ValidationPayload(
		boolean valid,
		List<String> errors
	) {
	}
}
