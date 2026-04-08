package io.openclaw.minecraftclaw.client;

import java.util.List;
import java.util.Optional;

public final class DesignPreviewSession {
	private final String snapshotId;
	private final String profileId;
	private final String providerName;
	private final String modelName;
	private final List<DesignCandidatePayload> candidates;
	private int activeCandidateIndex;

	private DesignPreviewSession(
		String snapshotId,
		String profileId,
		String providerName,
		String modelName,
		List<DesignCandidatePayload> candidates
	) {
		this.snapshotId = snapshotId;
		this.profileId = profileId;
		this.providerName = providerName;
		this.modelName = modelName;
		this.candidates = List.copyOf(candidates);
		this.activeCandidateIndex = 0;
	}

	public static DesignPreviewSession ready(
		String snapshotId,
		String profileId,
		String providerName,
		String modelName,
		List<DesignCandidatePayload> candidates
	) {
		return new DesignPreviewSession(snapshotId, profileId, providerName, modelName, candidates);
	}

	public String snapshotId() {
		return snapshotId;
	}

	public String profileId() {
		return profileId;
	}

	public String providerName() {
		return providerName;
	}

	public String modelName() {
		return modelName;
	}

	public List<DesignCandidatePayload> candidates() {
		return candidates;
	}

	public int activeCandidateIndex() {
		return activeCandidateIndex;
	}

	public Optional<DesignCandidatePayload> activeCandidate() {
		if (candidates.isEmpty()) {
			return Optional.empty();
		}

		return Optional.of(candidates.get(activeCandidateIndex));
	}

	public void selectCandidate(int index) {
		if (index < 0 || index >= candidates.size()) {
			return;
		}

		activeCandidateIndex = index;
	}
}
