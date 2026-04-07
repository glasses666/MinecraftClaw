import type { RuntimeBlueprint } from "../builder/runtime-blueprint.js";

export interface DesignRequestFileMap {
  spaceContext: string;
  environmentViews: string;
  playerContext: string;
  gameContext: string;
  paletteCatalog: string;
}

export interface DesignSelection {
  absoluteBounds: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  localOriginRule: string;
}

export interface DesignPromptContext {
  prompt: string;
  positivePrompt?: string;
  negativePrompt?: string;
  candidateCount: number;
}

export interface DesignRequest {
  snapshotId: string;
  selection: DesignSelection;
  promptContext: DesignPromptContext;
  files: DesignRequestFileMap;
}

export interface PaletteLegendEntry {
  token: string;
  label: string;
  blockIds: string[];
}

export interface SpaceContext {
  legend: Record<string, PaletteLegendEntry>;
  slices: Array<{
    y: number;
    rows: string[];
  }>;
  projections?: Record<string, string[]>;
}

export interface EnvironmentViews {
  views: Array<{
    direction: string;
    summary?: string;
    imageFile?: string | null;
  }>;
}

export interface PlayerContext {
  gameMode: string;
  inventory: Array<{
    itemId: string;
    count: number;
  }>;
  playerPosition?: { x: number; y: number; z: number };
}

export interface GameContext {
  minecraftVersion: string;
  mods: Array<{
    id: string;
    version: string;
  }>;
}

export interface PaletteCatalog {
  entries: Array<{
    token: string;
    itemId: string;
    category: string;
  }>;
}

export interface LoadedDesignSnapshot {
  rootDir: string;
  request: DesignRequest;
  spaceContext: SpaceContext;
  environmentViews: EnvironmentViews;
  playerContext: PlayerContext;
  gameContext: GameContext;
  paletteCatalog: PaletteCatalog;
}

export interface DesignProviderRequest {
  providerName: string;
  modelName: string;
}

export interface DesignProviderMetadata {
  name: string;
  model: string;
}

export interface DesignCandidate {
  candidateId: string;
  title: string;
  description: string;
  styleTags: string[];
  visualBlueprint: {
    legend: Record<string, PaletteLegendEntry>;
    slices: Array<{
      y: number;
      rows: string[];
    }>;
  };
  localBlueprintJson: RuntimeBlueprint;
  materialsRequired: Array<{
    itemId: string;
    required: number;
  }>;
  validation: {
    valid: boolean;
    errors: string[];
  };
}

export interface DesignCandidateResponse {
  snapshotId: string;
  provider: DesignProviderMetadata;
  candidates: DesignCandidate[];
}
