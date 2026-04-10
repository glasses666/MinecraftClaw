import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import { generateDesignCandidates } from "./candidate-generator.js";
import { loadDesignSnapshot } from "./snapshot.js";
import type { DesignCandidateResponse, LoadedDesignSnapshot } from "./types.js";

export interface DesignGenerationHttpRequest {
  snapshotDir: string;
  snapshotId: string;
  providerProfileId: string;
  providerType: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface DesignDaemonServerOptions {
  token: string;
  generateCandidates?: (
    request: DesignGenerationHttpRequest,
    snapshot: LoadedDesignSnapshot
  ) => Promise<DesignCandidateResponse> | DesignCandidateResponse;
}

export function createDesignDaemonServer(options: DesignDaemonServerOptions): Server {
  return createServer(async (request, response) => {
    try {
      if (request.method === "GET" && request.url === "/health") {
        if (!hasBearerToken(request, options.token)) {
          writeJson(response, 401, { error: "unauthorized" });
          return;
        }

        writeJson(response, 200, { status: "ok" });
        return;
      }

      if (request.method !== "POST" || request.url !== "/design/generate") {
        writeJson(response, 404, { error: "not_found" });
        return;
      }

      if (!hasBearerToken(request, options.token)) {
        writeJson(response, 401, { error: "unauthorized" });
        return;
      }

      const generationRequest = normalizeRequest(await readJsonBody(request));
      const snapshot = await loadDesignSnapshot(generationRequest.snapshotDir);
      if (snapshot.request.snapshotId !== generationRequest.snapshotId) {
        writeJson(response, 400, {
          error: "snapshot_id_mismatch",
          message: `Snapshot id ${generationRequest.snapshotId} does not match ${snapshot.request.snapshotId}.`
        });
        return;
      }

      const result = await (options.generateCandidates ?? generateStubbedCandidates)(generationRequest, snapshot);
      writeJson(response, 200, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      writeJson(response, 400, {
        error: "bad_request",
        message
      });
    }
  });
}

async function generateStubbedCandidates(
  request: DesignGenerationHttpRequest,
  snapshot: LoadedDesignSnapshot
): Promise<DesignCandidateResponse> {
  return generateDesignCandidates(snapshot, {
    providerName: request.providerProfileId,
    modelName: request.model
  });
}

function hasBearerToken(request: IncomingMessage, token: string): boolean {
  const value = request.headers.authorization;
  if (!value) {
    return false;
  }

  return value === `Bearer ${token}`;
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (raw.trim().length === 0) {
    throw new Error("Request body is required.");
  }

  return JSON.parse(raw);
}

function normalizeRequest(input: unknown): DesignGenerationHttpRequest {
  if (!input || typeof input !== "object") {
    throw new Error("Generation request must be a JSON object.");
  }

  const body = input as Record<string, unknown>;
  return {
    snapshotDir: requiredString(body.snapshotDir, "snapshotDir"),
    snapshotId: requiredString(body.snapshotId, "snapshotId"),
    providerProfileId: requiredString(body.providerProfileId, "providerProfileId"),
    providerType: requiredString(body.providerType, "providerType"),
    baseUrl: requiredString(body.baseUrl, "baseUrl"),
    apiKey: optionalString(body.apiKey),
    model: requiredString(body.model, "model")
  };
}

function requiredString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }

  return value.trim();
}

function optionalString(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function writeJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(body));
}
