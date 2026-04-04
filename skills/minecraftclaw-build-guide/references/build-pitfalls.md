# MinecraftClaw Build Pitfalls

## Scope

This reference captures the actual failures and recoveries from bootstrapping MinecraftClaw on macOS with PrismLauncher, Fabric 1.20.1, and a mixed MCP/Fabric repository layout.

## Known Working Baseline

- Workspace:
  `/Users/dracoglasser/自定程式/codex_playground/2026-04-04-1515-fabric-mcp-builder-bot`
- Target instance:
  `$HOME/Library/Application Support/PrismLauncher/instances/乌托邦探险之旅3.5fix`
- Prism Java:
  `$HOME/Library/Application Support/PrismLauncher/java/java-runtime-gamma`
- Minecraft:
  `1.20.1`
- Fabric Loader in instance:
  `0.17.2`

## Pitfall 1: System Java 26 Breaks the Fabric Build

### Symptom

Gradle fails during build script analysis with:

```text
Unsupported class file major version 70
```

### Root Cause

The machine default Java was 26, while the Fabric Loom and Groovy build path used here is stable under Java 17.

### Fix

Build with Prism's Java runtime:

```bash
JAVA_HOME="$HOME/Library/Application Support/PrismLauncher/java/java-runtime-gamma" \
GRADLE_USER_HOME=$PWD/.gradle-home \
./gradlew :mod:build --no-daemon
```

## Pitfall 2: Global npm Cache Permissions Are Dirty

### Symptom

`npm` errors with EPERM against `~/.npm`.

### Root Cause

The user-global cache contains files not writable from the current environment.

### Fix

Always run npm with a repo-local cache:

```bash
NPM_CONFIG_CACHE=$PWD/.npm-cache npm install
NPM_CONFIG_CACHE=$PWD/.npm-cache npm test
NPM_CONFIG_CACHE=$PWD/.npm-cache npm run build
```

## Pitfall 3: Gradle Wrapper Timeout Is Too Aggressive

### Symptom

Wrapper download times out while fetching the Gradle distribution.

### Fix

Increase `gradle/wrapper/gradle-wrapper.properties`:

```properties
networkTimeout=120000
```

## Pitfall 4: Wrapper Files Must Be In The Right Directory

### Symptom

Gradle fails with:

```text
Could not find or load main class org.gradle.wrapper.GradleWrapperMain
```

### Root Cause

The wrapper jar and properties were copied to the repository root instead of `gradle/wrapper/`.

### Fix

Place these files exactly here:

```text
gradle/wrapper/gradle-wrapper.jar
gradle/wrapper/gradle-wrapper.properties
```

## Pitfall 5: Loom Leaves Stale Cache Locks After Abrupt Failure

### Symptom

Subsequent builds say Loom is waiting on or repairing a stale cache lock.

### Fix

1. Stop daemons:

```bash
JAVA_HOME="$HOME/Library/Application Support/PrismLauncher/java/java-runtime-gamma" \
GRADLE_USER_HOME=$PWD/.gradle-home \
./gradlew --stop
```

2. Remove the stale lock under:

```text
.gradle-home/caches/fabric-loom/
```

3. Retry the build.

## Pitfall 6: Mojang Jar Downloads Can Truncate Mid-Stream

### Symptom

Loom fails downloading `client.jar` or `server.jar` with content-length mismatch, EOF, or closed stream errors.

### Fix

Seed the Loom cache manually:

```bash
mkdir -p .gradle-home/caches/fabric-loom/1.20.1

curl -L --fail --retry 5 --retry-delay 2 \
  -o .gradle-home/caches/fabric-loom/1.20.1/minecraft-client.jar \
  https://piston-data.mojang.com/v1/objects/0c3ec587af28e5a785c0b4a7b8a30f9a8f78f838/client.jar

curl -L --fail --retry 5 --retry-delay 2 \
  -o .gradle-home/caches/fabric-loom/1.20.1/minecraft-server.jar \
  https://piston-data.mojang.com/v1/objects/84194a2f286ef7c14ed7ce0090dba59902951553/server.jar
```

Validate checksums:

```text
client: 0c3ec587af28e5a785c0b4a7b8a30f9a8f78f838
server: 84194a2f286ef7c14ed7ce0090dba59902951553
```

## Pitfall 7: Offline Build Still Needs Cached Maven Artifacts

### Symptom

`--offline` build fails because a dependency such as `net.fabricmc:yarn:1.20.1+build.10` or `it.unimi.dsi:fastutil:8.5.9` is missing from the Gradle module cache.

### Fix

- Let one online build populate metadata if the network is stable.
- For large jars already present in PrismLauncher, seed Gradle from the Prism cache.

Example source:

```text
$HOME/Library/Application Support/PrismLauncher/libraries/it/unimi/dsi/fastutil/8.5.9/fastutil-8.5.9.jar
```

## Pitfall 8: The New Mod Is Not Always The Crash Cause

### Symptom

The instance crashes after adding MinecraftClaw, so it is tempting to blame MinecraftClaw.

### Actual Finding

The test launch recognized `minecraftclaw 0.1.0`, but the startup failure came from:

```text
dynamiccrosshaircompat.mixins.json:mcwroofs.GutterMixin
```

This is an unrelated client-side compatibility mod.

### Evidence

- `latest.log` shows `minecraftclaw 0.1.0`
- `latest.log` also shows the first hard error from `dynamiccrosshaircompat`

## Pitfall 9: Instance-Specific Testing Beats Global .minecraft Assumptions

### Symptom

Looking only at `~/Library/Application Support/minecraft` suggests there is no matching 1.20.1 environment.

### Root Cause

The real test environment lives under PrismLauncher instance storage, not the global launcher directory.

### Fix

Inspect:

```text
$HOME/Library/Application Support/PrismLauncher/instances
```

For this project, the correct instance was:

```text
乌托邦探险之旅3.5fix
```

## Fast Recovery Checklist

1. Use Prism Java 17.
2. Use `.npm-cache` and `.gradle-home`.
3. Stop Gradle daemons.
4. Clear stale Loom lock files.
5. Seed `minecraft-client.jar` and `minecraft-server.jar` if downloads were truncated.
6. Re-run `:mod:build --no-daemon`.
7. Copy the jar into the Prism instance `mods/` folder.
8. Launch the instance.
9. Inspect `latest.log` before blaming MinecraftClaw.
