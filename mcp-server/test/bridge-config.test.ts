import test from "node:test";
import assert from "node:assert/strict";

import { resolveBridgeConfig } from "../src/bridge/config.js";

test("resolveBridgeConfig returns localhost defaults when env is empty", () => {
  const config = resolveBridgeConfig({});

  assert.deepEqual(config, {
    host: "127.0.0.1",
    port: 47127,
    timeoutMs: 5_000
  });
});

test("resolveBridgeConfig reads and normalizes bridge values from env", () => {
  const config = resolveBridgeConfig({
    MCCLAW_BRIDGE_HOST: " localhost ",
    MCCLAW_BRIDGE_PORT: "48000",
    MCCLAW_BRIDGE_TIMEOUT_MS: "12000"
  });

  assert.deepEqual(config, {
    host: "localhost",
    port: 48000,
    timeoutMs: 12_000
  });
});
