package io.openclaw.minecraftclaw.export;

import java.io.IOException;
import java.time.Instant;
import net.minecraft.server.network.ServerPlayerEntity;

public final class RawExportService {
	private RawExportService() {
	}

	public static RawExportPaths export(ServerPlayerEntity player) throws IOException {
		Instant scannedAt = Instant.now();
		RawExportProfile profile = RawExportProfile.defaultProfile();
		RawExportSnapshot snapshot = RawScanCapture.capture(player, profile, scannedAt);
		return RawExportWriter.write(
			player.getServer().getRunDirectory().toPath(),
			player.getName().getString(),
			scannedAt,
			profile,
			snapshot
		);
	}
}
