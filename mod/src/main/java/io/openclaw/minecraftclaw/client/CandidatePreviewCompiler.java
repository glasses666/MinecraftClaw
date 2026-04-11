package io.openclaw.minecraftclaw.client;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class CandidatePreviewCompiler {
	private static final Pattern SETBLOCK_PATTERN =
		Pattern.compile("setblock\\s+\\{x\\}\\s+\\{y\\}\\s+\\{z\\}\\s+([^\\s]+)", Pattern.CASE_INSENSITIVE);

	private CandidatePreviewCompiler() {
	}

	public static List<PreviewVoxel> compile(RuntimeBlueprintPayload blueprint) {
		Map<String, PreviewVoxel> voxels = new LinkedHashMap<>();

		for (RuntimeBlueprintStepPayload step : blueprint.steps()) {
			switch (step.kind()) {
				case "fill" -> fill(voxels, step);
				case "block" -> put(voxels, step.at(), step.blockId());
				case "command" -> {
					String blockId = extractSetblockBlockId(step.commandTemplate());
					if (blockId != null) {
						put(voxels, step.offset(), blockId);
					}
				}
				default -> {
				}
			}
		}

		return List.copyOf(voxels.values());
	}

	private static void fill(Map<String, PreviewVoxel> voxels, RuntimeBlueprintStepPayload step) {
		for (int x = Math.min(step.from().x(), step.to().x()); x <= Math.max(step.from().x(), step.to().x()); x += 1) {
			for (int y = Math.min(step.from().y(), step.to().y()); y <= Math.max(step.from().y(), step.to().y()); y += 1) {
				for (int z = Math.min(step.from().z(), step.to().z()); z <= Math.max(step.from().z(), step.to().z()); z += 1) {
					put(voxels, new LocalBlockPos(x, y, z), step.blockId());
				}
			}
		}
	}

	private static void put(Map<String, PreviewVoxel> voxels, LocalBlockPos position, String blockId) {
		if (position == null || blockId == null) {
			return;
		}

		ParsedBlockSpec parsed = ParsedBlockSpec.parse(blockId);
		if ("minecraft:air".equals(parsed.blockId())) {
			return;
		}

		voxels.put(key(position), new PreviewVoxel(position.x(), position.y(), position.z(), parsed.blockId(), parsed.stateProperties()));
	}

	private static String extractSetblockBlockId(String commandTemplate) {
		if (commandTemplate == null) {
			return null;
		}

		Matcher matcher = SETBLOCK_PATTERN.matcher(commandTemplate);
		if (!matcher.find()) {
			return null;
		}

		return matcher.group(1);
	}

	private static String key(LocalBlockPos position) {
		return position.x() + "," + position.y() + "," + position.z();
	}

	private record ParsedBlockSpec(
		String blockId,
		String stateProperties
	) {
		private static ParsedBlockSpec parse(String input) {
			String trimmed = input.trim();
			int stateStart = trimmed.indexOf('[');
			if (stateStart < 0 || !trimmed.endsWith("]")) {
				return new ParsedBlockSpec(trimmed, null);
			}

			return new ParsedBlockSpec(
				trimmed.substring(0, stateStart),
				trimmed.substring(stateStart + 1, trimmed.length() - 1)
			);
		}
	}
}
