import fs from "node:fs/promises";
import path from "node:path";

import type {
  EnvironmentViews,
  GameContext,
  LoadedDesignSnapshot,
  PaletteCatalog,
  PlayerContext,
  SpaceContext,
  DesignRequest
} from "./types.js";

export async function loadDesignSnapshot(rootDir: string): Promise<LoadedDesignSnapshot> {
  const request = await readJsonFile<DesignRequest>(path.join(rootDir, "request.json"));

  return {
    rootDir,
    request,
    spaceContext: await readJsonFile<SpaceContext>(path.join(rootDir, request.files.spaceContext)),
    environmentViews: await readJsonFile<EnvironmentViews>(path.join(rootDir, request.files.environmentViews)),
    playerContext: await readJsonFile<PlayerContext>(path.join(rootDir, request.files.playerContext)),
    gameContext: await readJsonFile<GameContext>(path.join(rootDir, request.files.gameContext)),
    paletteCatalog: await readJsonFile<PaletteCatalog>(path.join(rootDir, request.files.paletteCatalog))
  };
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}
