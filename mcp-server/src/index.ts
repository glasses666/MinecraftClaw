import { resolveBridgeConfig } from "./bridge/config.js";

const config = resolveBridgeConfig();

console.log(
  JSON.stringify(
    {
      service: "minecraftclaw-mcp-server",
      status: "bootstrap",
      bridge: config
    },
    null,
    2
  )
);
