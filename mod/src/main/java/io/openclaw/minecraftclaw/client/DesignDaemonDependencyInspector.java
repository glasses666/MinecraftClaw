package io.openclaw.minecraftclaw.client;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class DesignDaemonDependencyInspector {
	private static final Pattern MISSING_PROBLEM_PATTERN =
		Pattern.compile("^missing:\\s+(.+?),\\s+required by.*$", Pattern.CASE_INSENSITIVE);

	private DesignDaemonDependencyInspector() {
	}

	public static List<String> extractMissingPackages(String npmLsJson) {
		try {
			JsonObject root = JsonParser.parseString(npmLsJson).getAsJsonObject();
			JsonArray problems = root.has("problems") ? root.getAsJsonArray("problems") : new JsonArray();
			List<String> packages = new ArrayList<>();
			for (JsonElement problemElement : problems) {
				String problem = problemElement.getAsString();
				Matcher matcher = MISSING_PROBLEM_PATTERN.matcher(problem);
				if (!matcher.matches()) {
					continue;
				}

				String rawPackage = matcher.group(1);
				int versionMarkerIndex = rawPackage.lastIndexOf('@');
				if (versionMarkerIndex > 0) {
					packages.add(rawPackage.substring(0, versionMarkerIndex));
				} else {
					packages.add(rawPackage);
				}
			}
			return List.copyOf(packages);
		} catch (RuntimeException exception) {
			return List.of();
		}
	}
}
