package io.openclaw.minecraftclaw.client;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import org.junit.jupiter.api.Test;

class DesignDaemonDependencyInspectorTest {
	@Test
	void extractsMissingPackagesFromNpmLsProblems() {
		String npmLsJson = """
			{
			  "problems": [
			    "missing: tsx@^4.19.0, required by @minecraftclaw/mcp-server@0.1.0",
			    "missing: typescript@^5.8.3, required by @minecraftclaw/mcp-server@0.1.0",
			    "missing: @modelcontextprotocol/sdk@^1.10.2, required by @minecraftclaw/mcp-server@0.1.0"
			  ]
			}
			""";

		assertEquals(
			List.of("tsx", "typescript", "@modelcontextprotocol/sdk"),
			DesignDaemonDependencyInspector.extractMissingPackages(npmLsJson)
		);
	}

	@Test
	void ignoresNonMissingProblems() {
		String npmLsJson = """
			{
			  "problems": [
			    "invalid: tslib@2.8.1 /tmp/mcp-server/node_modules/tslib"
			  ]
			}
			""";

		assertEquals(List.of(), DesignDaemonDependencyInspector.extractMissingPackages(npmLsJson));
	}
}
