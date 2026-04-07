import { generateDesignCandidates } from "./candidate-generator.js";
import { loadDesignSnapshot } from "./snapshot.js";

async function main(): Promise<void> {
  const snapshotDir = process.argv[2];

  if (!snapshotDir) {
    throw new Error("Usage: npm run design:snapshot -- <snapshot-directory>");
  }

  const snapshot = await loadDesignSnapshot(snapshotDir);
  const response = generateDesignCandidates(snapshot, {
    providerName: process.env.MINECRAFTCLAW_PROVIDER_NAME ?? "local-stub",
    modelName: process.env.MINECRAFTCLAW_PROVIDER_MODEL ?? "baseline-design-synth"
  });

  process.stdout.write(`${JSON.stringify(response, null, 2)}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`[minecraftclaw-design] failed: ${message}\n`);
  process.exitCode = 1;
});
