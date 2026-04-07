package io.openclaw.minecraftclaw.snapshot;

public record DesignPromptContext(
	String prompt,
	String positivePrompt,
	String negativePrompt,
	int candidateCount
) {
}
