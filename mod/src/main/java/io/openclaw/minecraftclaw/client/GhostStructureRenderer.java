package io.openclaw.minecraftclaw.client;

import io.openclaw.minecraftclaw.selection.SelectionVolume;
import java.util.List;
import net.minecraft.client.util.math.MatrixStack;
import net.minecraft.util.math.Box;

public final class GhostStructureRenderer {
	private static final SelectionBoxRenderer.SelectionVisual GHOST_VISUAL =
		new SelectionBoxRenderer.SelectionVisual(0.84F, 0.91F, 1.0F, 0.13F, 0.28F);

	private GhostStructureRenderer() {
	}

	public static void render(
		MatrixStack matrices,
		SelectionVolume selection,
		List<PreviewVoxel> voxels,
		double cameraX,
		double cameraY,
		double cameraZ
	) {
		for (PreviewVoxel voxel : voxels) {
			Box box = new Box(
				selection.min().getX() + voxel.x(),
				selection.min().getY() + voxel.y(),
				selection.min().getZ() + voxel.z(),
				selection.min().getX() + voxel.x() + 1,
				selection.min().getY() + voxel.y() + 1,
				selection.min().getZ() + voxel.z() + 1
			).offset(-cameraX, -cameraY, -cameraZ);
			SelectionBoxRenderer.render(matrices, box, GHOST_VISUAL);
		}
	}
}
