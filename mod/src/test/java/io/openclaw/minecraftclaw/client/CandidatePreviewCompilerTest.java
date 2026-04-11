package io.openclaw.minecraftclaw.client;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.util.List;
import org.junit.jupiter.api.Test;

class CandidatePreviewCompilerTest {
	@Test
	void compilesFillBlockAndSafeSetblockStepsIntoPreviewVoxels() {
		RuntimeBlueprintPayload blueprint = new RuntimeBlueprintPayload(
			"candidate-1",
			8,
			8,
			8,
			List.of(
				RuntimeBlueprintStepPayload.fill(
					new LocalBlockPos(1, 1, 1),
					new LocalBlockPos(2, 1, 2),
					"minecraft:spruce_planks"
				),
				RuntimeBlueprintStepPayload.block(
					new LocalBlockPos(3, 1, 3),
					"minecraft:glass"
				),
				RuntimeBlueprintStepPayload.command(
					"setblock {x} {y} {z} minecraft:lantern[hanging=true]",
					new LocalBlockPos(4, 2, 4)
				)
			)
		);

		List<PreviewVoxel> voxels = CandidatePreviewCompiler.compile(blueprint);

		assertEquals(6, voxels.size());
		assertTrueContains(voxels, new PreviewVoxel(1, 1, 1, "minecraft:spruce_planks", null));
		assertTrueContains(voxels, new PreviewVoxel(2, 1, 2, "minecraft:spruce_planks", null));
		assertTrueContains(voxels, new PreviewVoxel(3, 1, 3, "minecraft:glass", null));
		assertTrueContains(voxels, new PreviewVoxel(4, 2, 4, "minecraft:lantern", "hanging=true"));
	}

	@Test
	void preservesInlineBlockStatesFromBlockSteps() {
		RuntimeBlueprintPayload blueprint = new RuntimeBlueprintPayload(
			"candidate-3",
			4,
			4,
			4,
			List.of(
				RuntimeBlueprintStepPayload.block(
					new LocalBlockPos(1, 1, 1),
					"minecraft:oak_stairs[facing=east,half=bottom,shape=straight]"
				)
			)
		);

		List<PreviewVoxel> voxels = CandidatePreviewCompiler.compile(blueprint);

		assertEquals(1, voxels.size());
		assertTrueContains(
			voxels,
			new PreviewVoxel(1, 1, 1, "minecraft:oak_stairs", "facing=east,half=bottom,shape=straight")
		);
	}

	@Test
	void skipsUnsafeOrNonSetblockCommands() {
		RuntimeBlueprintPayload blueprint = new RuntimeBlueprintPayload(
			"candidate-2",
			4,
			4,
			4,
			List.of(
				RuntimeBlueprintStepPayload.command(
					"fill {x} {y} {z} {x} {y} {z} minecraft:stone",
					new LocalBlockPos(1, 1, 1)
				)
			)
		);

		List<PreviewVoxel> voxels = CandidatePreviewCompiler.compile(blueprint);

		assertFalse(voxels.iterator().hasNext());
	}

	private static void assertTrueContains(List<PreviewVoxel> voxels, PreviewVoxel expected) {
		org.junit.jupiter.api.Assertions.assertTrue(
			voxels.contains(expected),
			"Expected voxel " + expected + " inside " + voxels
		);
	}
}
