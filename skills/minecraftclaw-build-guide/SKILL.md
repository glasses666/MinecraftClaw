---
name: minecraftclaw-build-guide
description: Troubleshoot and stabilize MinecraftClaw Fabric 1.20.1 builds, mod installation, and PrismLauncher test launches on macOS. Use when building the mod, diagnosing Gradle/Loom download failures, resolving Java/runtime mismatches, or validating whether MinecraftClaw actually loads inside the target PrismLauncher instance.
---

# MinecraftClaw Build Guide

## Overview

Use this skill to rebuild MinecraftClaw reliably, install the jar into the real 1.20.1 test instance, and separate MinecraftClaw issues from unrelated client-mod crashes.

Read [references/build-pitfalls.md](references/build-pitfalls.md) when you need the exact failure signatures, cache paths, or recovery steps from the initial bootstrap session.

## Build Workflow

Rebuild MinecraftClaw in this order:

1. Use the PrismLauncher Java 17 runtime, not the system Java.
2. Keep Gradle and npm caches inside the repository.
3. Build the MCP server first to catch local TypeScript issues quickly.
4. Build the Fabric mod with the Prism Java runtime.
5. Copy the built jar into the active Prism 1.20.1 instance.
6. Launch the instance and inspect `latest.log` for MinecraftClaw load evidence.

Use these commands as the default baseline:

```bash
NPM_CONFIG_CACHE=$PWD/.npm-cache npm test
NPM_CONFIG_CACHE=$PWD/.npm-cache npm run build
JAVA_HOME="$HOME/Library/Application Support/PrismLauncher/java/java-runtime-gamma" \
GRADLE_USER_HOME=$PWD/.gradle-home \
./gradlew :mod:build --no-daemon
```

## Installation Workflow

Install the built jar into this Prism instance unless the project context says otherwise:

```text
$HOME/Library/Application Support/PrismLauncher/instances/乌托邦探险之旅3.5fix/minecraft/mods
```

The expected artifact is:

```text
mod/build/libs/minecraftclaw-0.1.0.jar
```

If the instance crashes before `MinecraftClaw initialized` appears, inspect `latest.log` and confirm whether the crash belongs to MinecraftClaw or to another client mod. Do not assume MinecraftClaw caused the failure just because it was newly added.

## Triage Rules

Follow this decision tree:

1. `npm` fails with cache permission errors:
   Use `NPM_CONFIG_CACHE=$PWD/.npm-cache`.

2. Gradle fails before compilation and the JVM is Java 26:
   Switch to the PrismLauncher Java 17 runtime immediately.

3. Gradle/Loom fails while downloading Minecraft jars:
   Check `references/build-pitfalls.md` for manual seeding steps and lock cleanup.

4. The game crashes on client launch:
   Search `latest.log` for `minecraftclaw`, `ERROR`, and the first stack trace. Confirm whether the offending mod is unrelated.

5. The mod list contains `minecraftclaw 0.1.0` but no `MinecraftClaw initialized` line:
   The loader saw the jar, but startup failed before the mod initializer ran.

## Verification

Verify success with evidence, not assumptions:

1. Confirm `mcp-server` test output is green.
2. Confirm `:mod:build` exits successfully.
3. Confirm the jar exists in `mod/build/libs/`.
4. Confirm the jar exists in the Prism instance `mods/` directory.
5. Confirm `latest.log` shows `minecraftclaw 0.1.0`.
6. Prefer finding `MinecraftClaw initialized` in the log before claiming the mod loaded fully.

## Output

Report using this structure:

```markdown
## Summary
[What worked and what failed]

## Evidence
- [Command and result]
- [Log path and key line]

## Blockers
- [Only if present]

## Next Step
- [Single highest-value action]
```
