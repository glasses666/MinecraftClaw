import { createDesignDaemonServer } from "./daemon-server.js";
import { resolveDesignDaemonConfig } from "./daemon-config.js";

async function main(): Promise<void> {
  const config = resolveDesignDaemonConfig();
  const server = createDesignDaemonServer({
    token: config.token
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.port, config.host, () => resolve());
  });

  process.stderr.write(
    `[minecraftclaw-design-daemon] listening on http://${config.host}:${config.port}\n`
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`[minecraftclaw-design-daemon] startup failed: ${message}\n`);
  process.exitCode = 1;
});
