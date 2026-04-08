package io.openclaw.minecraftclaw.client;

import java.util.List;

public record DesignCandidateResponsePayload(
	String snapshotId,
	DesignProviderPayload provider,
	List<DesignCandidatePayload> candidates
) {
}
