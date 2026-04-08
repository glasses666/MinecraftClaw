package io.openclaw.minecraftclaw.client;

import io.openclaw.minecraftclaw.snapshot.DesignPromptContext;

public record DesignPromptInputs(
	String prompt,
	String positivePrompt,
	String negativePrompt,
	int candidateCount
) {
	public DesignPromptContext toPromptContext() {
		return new DesignPromptContext(prompt, positivePrompt, negativePrompt, candidateCount);
	}
}
