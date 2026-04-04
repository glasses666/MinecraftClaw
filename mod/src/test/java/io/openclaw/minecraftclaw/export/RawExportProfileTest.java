package io.openclaw.minecraftclaw.export;

import java.util.List;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

final class RawExportProfileTest {
	@Test
	void defaultProfileMatchesTheAgreedInitialScanShape() {
		RawExportProfile profile = RawExportProfile.defaultProfile();

		assertEquals(16, profile.localWidth());
		assertEquals(16, profile.localDepth());
		assertEquals(8, profile.localHeight());
		assertEquals(32, profile.surfaceWidth());
		assertEquals(32, profile.surfaceDepth());
	}

	@Test
	void defaultProfileExportsTheExpectedRawFiles() {
		RawExportProfile profile = RawExportProfile.defaultProfile();

		assertEquals(
			List.of(
				"scan_meta.json",
				"player_state.json",
				"inventory.json",
				"local_blocks.json",
				"block_entities.json",
				"entities.json",
				"surface_map.json"
			),
			profile.fileNames()
		);
	}
}
