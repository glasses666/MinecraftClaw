import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { MinecraftClawBridgeClient } from "./bridge/client.js";
import { resolveBridgeConfig } from "./bridge/config.js";
import { createMinecraftClawMcpServer } from "./mcp/server.js";

async function main(): Promise<void> {
  const config = resolveBridgeConfig();
  const bridgeClient = new MinecraftClawBridgeClient(config);
  const server = createMinecraftClawMcpServer({
    getPlayerState: () => bridgeClient.getPlayerState(),
    teleportPlayer: (request) => bridgeClient.teleportPlayer(request),
    scanLocalSpace: (request) => bridgeClient.scanLocalSpace(request),
    placeBlock: (request) => bridgeClient.placeBlock(request),
    fillBox: (request) => bridgeClient.fillBox(request),
    runCommand: (request) => bridgeClient.runCommand(request)
  });
  const transport = new StdioServerTransport();

  await server.connect(transport);
  process.stderr.write(
    `[minecraftclaw-mcp] stdio server ready for ${config.host}:${config.port}\n`
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`[minecraftclaw-mcp] startup failed: ${message}\n`);
  process.exitCode = 1;
});
