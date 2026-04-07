package io.openclaw.minecraftclaw.selection;

public record SelectionLimits(
	int softMaxAxis,
	int softMaxVolume,
	int hardMaxAxis,
	int hardMaxVolume
) {
	public static SelectionLimits defaultLimits() {
		return new SelectionLimits(24, 12_288, 32, 32_768);
	}

	public boolean requiresLargeBuildWarning(SelectionVolume selection) {
		return selection.width() > softMaxAxis
			|| selection.height() > softMaxAxis
			|| selection.depth() > softMaxAxis
			|| selection.volume() > softMaxVolume;
	}

	public boolean isWithinHardLimit(SelectionVolume selection) {
		return selection.width() <= hardMaxAxis
			&& selection.height() <= hardMaxAxis
			&& selection.depth() <= hardMaxAxis
			&& selection.volume() <= hardMaxVolume;
	}
}
