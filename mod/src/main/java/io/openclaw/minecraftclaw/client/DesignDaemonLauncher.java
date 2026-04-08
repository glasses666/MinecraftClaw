package io.openclaw.minecraftclaw.client;

import io.openclaw.minecraftclaw.MinecraftClawMod;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.TimeUnit;

public final class DesignDaemonLauncher {
	private static final Duration QUICK_COMMAND_TIMEOUT = Duration.ofSeconds(8);
	private static final Duration INSTALL_TIMEOUT = Duration.ofMinutes(3);
	private static final Duration HEALTH_TIMEOUT = Duration.ofSeconds(12);

	private final DesignDaemonClient daemonClient;
	private final DesignDaemonLauncherConfigStore configStore;
	private final Path logFile;
	private Process ownedProcess;

	public DesignDaemonLauncher(
		DesignDaemonClient daemonClient,
		DesignDaemonLauncherConfigStore configStore,
		Path logFile
	) {
		this.daemonClient = daemonClient;
		this.configStore = configStore;
		this.logFile = logFile;
	}

	public synchronized String ensureRunning() throws IOException, InterruptedException {
		configStore.writeTemplateIfMissing();
		DesignDaemonLauncherConfig config = configStore.load().orElseThrow(() ->
			new IOException("Design daemon launcher config is missing: " + configStore.stateFile())
		);

		String configuredDir = config.mcpServerDir() == null ? "" : config.mcpServerDir().trim();
		if (configuredDir.isEmpty() || configuredDir.startsWith("/absolute/path/to/")) {
			throw new IOException("Set mcpServerDir in " + configStore.stateFile());
		}

		Path mcpServerDir = Path.of(configuredDir).toAbsolutePath().normalize();
		validateWorkspace(mcpServerDir);
		requireCommand("node");
		requireCommand("npm");
		ensureDependencies(mcpServerDir);

		if (daemonClient.isHealthy()) {
			return "MinecraftClaw: design daemon is ready.";
		}

		startOwnedProcessIfNeeded(mcpServerDir);
		long deadline = System.nanoTime() + HEALTH_TIMEOUT.toNanos();
		while (System.nanoTime() < deadline) {
			if (daemonClient.isHealthy()) {
				return "MinecraftClaw: design daemon started and passed dependency checks.";
			}
			Thread.sleep(500L);
		}

		throw new IOException("Design daemon failed health check after startup. See log: " + logFile);
	}

	public synchronized void stop() {
		if (ownedProcess == null) {
			return;
		}

		ownedProcess.destroy();
		ownedProcess = null;
	}

	private void validateWorkspace(Path mcpServerDir) throws IOException {
		if (!Files.isDirectory(mcpServerDir)) {
			throw new IOException("Configured mcpServerDir does not exist: " + mcpServerDir);
		}
		if (!Files.exists(mcpServerDir.resolve("package.json"))) {
			throw new IOException("Missing package.json in " + mcpServerDir);
		}
		if (!Files.exists(mcpServerDir.resolve("package-lock.json"))) {
			throw new IOException("Missing package-lock.json in " + mcpServerDir);
		}
	}

	private void requireCommand(String command) throws IOException, InterruptedException {
		CommandResult result = runCapturedCommand(null, QUICK_COMMAND_TIMEOUT, command, "--version");
		if (result.exitCode() != 0) {
			throw new IOException("Missing required executable `" + command + "` on PATH.");
		}
	}

	private void ensureDependencies(Path mcpServerDir) throws IOException, InterruptedException {
		CommandResult dependencyCheck = runCapturedCommand(mcpServerDir, QUICK_COMMAND_TIMEOUT, "npm", "ls", "--depth=0", "--json");
		List<String> missingPackages = DesignDaemonDependencyInspector.extractMissingPackages(dependencyCheck.output());
		if (dependencyCheck.exitCode() == 0 && missingPackages.isEmpty()) {
			return;
		}

		CommandResult installResult = runLoggedCommand(mcpServerDir, INSTALL_TIMEOUT, "npm", "ci");
		if (installResult.exitCode() != 0) {
			throw new IOException("npm ci failed while preparing design daemon dependencies. See log: " + logFile);
		}

		CommandResult recheck = runCapturedCommand(mcpServerDir, QUICK_COMMAND_TIMEOUT, "npm", "ls", "--depth=0", "--json");
		List<String> remainingMissingPackages = DesignDaemonDependencyInspector.extractMissingPackages(recheck.output());
		if (!remainingMissingPackages.isEmpty()) {
			throw new IOException("Missing design daemon packages: " + String.join(", ", remainingMissingPackages));
		}
		if (recheck.exitCode() != 0) {
			throw new IOException("Dependency check failed after npm ci. See log: " + logFile);
		}
	}

	private void startOwnedProcessIfNeeded(Path mcpServerDir) throws IOException {
		if (ownedProcess != null && ownedProcess.isAlive()) {
			return;
		}

		Files.createDirectories(logFile.getParent());
		ProcessBuilder processBuilder = new ProcessBuilder("npm", "run", "design:daemon");
		processBuilder.directory(mcpServerDir.toFile());
		processBuilder.redirectErrorStream(true);
		processBuilder.redirectOutput(ProcessBuilder.Redirect.appendTo(logFile.toFile()));
		ownedProcess = processBuilder.start();
		MinecraftClawMod.LOGGER.info("MinecraftClaw launched design daemon from {}", mcpServerDir);
	}

	private CommandResult runCapturedCommand(Path directory, Duration timeout, String... command) throws IOException, InterruptedException {
		ProcessBuilder processBuilder = new ProcessBuilder(command);
		if (directory != null) {
			processBuilder.directory(directory.toFile());
		}
		processBuilder.redirectErrorStream(true);
		Process process = processBuilder.start();
		ByteArrayOutputStream outputBuffer = new ByteArrayOutputStream();
		try (InputStream inputStream = process.getInputStream()) {
			inputStream.transferTo(outputBuffer);
		}
		boolean completed = process.waitFor(timeout.toMillis(), TimeUnit.MILLISECONDS);
		if (!completed) {
			process.destroyForcibly();
			throw new IOException("Command timed out: " + String.join(" ", command));
		}

		return new CommandResult(process.exitValue(), outputBuffer.toString(StandardCharsets.UTF_8));
	}

	private CommandResult runLoggedCommand(Path directory, Duration timeout, String... command) throws IOException, InterruptedException {
		Files.createDirectories(logFile.getParent());
		ProcessBuilder processBuilder = new ProcessBuilder(command);
		processBuilder.directory(directory.toFile());
		processBuilder.redirectErrorStream(true);
		processBuilder.redirectOutput(ProcessBuilder.Redirect.appendTo(logFile.toFile()));
		Process process = processBuilder.start();
		boolean completed = process.waitFor(timeout.toMillis(), TimeUnit.MILLISECONDS);
		if (!completed) {
			process.destroyForcibly();
			throw new IOException("Command timed out: " + String.join(" ", command));
		}
		return new CommandResult(process.exitValue(), "");
	}

	private record CommandResult(
		int exitCode,
		String output
	) {
	}
}
