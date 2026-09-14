#!/usr/bin/env node
/** Focused static verification for the generated native Codex package. */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import {
  buildNativeCodexCompat,
  createLegacyManifest,
  createLegacyMcp,
  nativeMarketplaceManifest,
  nativePluginRoot,
  portablePluginRoot,
} from "./build-native-codex-compat.mjs";

const hostedMcpUrl = "https://project-visual-team-mcp.onrender.com/mcp";
const absolutePathPattern = /(?<![A-Za-z])[A-Za-z]:[\\/]|\/home\/|\/Users\//;

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return false;
    throw error;
  }
}

async function filesInDirectory(root) {
  const paths = [];

  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
      } else if (entry.isFile()) {
        paths.push(path);
      }
    }
  }

  await walk(root);
  return paths;
}

async function fileDigests(root) {
  const digests = new Map();
  for (const path of await filesInDirectory(root)) {
    const contents = await readFile(path);
    digests.set(relative(root, path).replaceAll("\\", "/"), createHash("sha256").update(contents).digest("hex"));
  }
  return digests;
}

function assertDirectoryDerived(source, artifact) {
  return Promise.all([fileDigests(source), fileDigests(artifact)]).then(([sourceDigests, artifactDigests]) => {
    assert.deepEqual(artifactDigests, sourceDigests, relative(portablePluginRoot, source) + " drifted in the native artifact");
  });
}

function packageRelativePath(root, relativePath, label) {
  assert.equal(typeof relativePath, "string", label + " must be a string path");
  assert.ok(relativePath.startsWith("./"), label + " must be package-relative: " + relativePath);
  const path = resolve(root, relativePath);
  const pathFromRoot = relative(root, path);
  assert.ok(
    pathFromRoot === "" || (!pathFromRoot.startsWith(".." + sep) && pathFromRoot !== ".."),
    label + " escapes the package: " + relativePath,
  );
  return path;
}

async function assertDeclaredArtifactPath(relativePath, label) {
  const path = packageRelativePath(nativePluginRoot, relativePath, label);
  assert.equal(await exists(path), true, label + " is absent from the artifact: " + relativePath);
}

function declaredInterfacePaths(interfaceConfig) {
  if (!interfaceConfig || typeof interfaceConfig !== "object") return [];

  const paths = [];
  for (const field of ["composerIcon", "logo"]) {
    if (interfaceConfig[field] !== undefined) paths.push(["interface." + field, interfaceConfig[field]]);
  }

  if (interfaceConfig.screenshots !== undefined) {
    const screenshots = interfaceConfig.screenshots;
    assert.ok(Array.isArray(screenshots), "interface.screenshots must be an array when declared");
    for (const [index, screenshot] of screenshots.entries()) {
      paths.push(["interface.screenshots[" + index + "]", screenshot]);
    }
  }

  return paths;
}

function commandTargets(command) {
  const targets = [];
  const pattern = /(?:^|\s)(?:"(\.\/[^"]+)"|'(\.\/[^']+)'|(\.\/\S+))/g;
  for (const match of command.matchAll(pattern)) {
    targets.push(match[1] ?? match[2] ?? match[3]);
  }
  return targets;
}

function hookCommands(hooksDocument) {
  const commands = [];
  const events = hooksDocument.hooks;
  assert.ok(events && typeof events === "object", "hooks.json must declare a hooks object");

  for (const [eventName, eventEntries] of Object.entries(events)) {
    assert.ok(Array.isArray(eventEntries), eventName + " must be an array of hook entries");
    for (const [entryIndex, eventEntry] of eventEntries.entries()) {
      assert.ok(eventEntry && typeof eventEntry === "object", eventName + "[" + entryIndex + "] must be an object");
      assert.ok(Array.isArray(eventEntry.hooks), eventName + "[" + entryIndex + "].hooks must be an array");
      for (const [hookIndex, hook] of eventEntry.hooks.entries()) {
        if (hook && typeof hook.command === "string") {
          commands.push({
            label: eventName + "[" + entryIndex + "].hooks[" + hookIndex + "].command",
            command: hook.command,
          });
        }
      }
    }
  }

  return commands;
}

async function assertHookCommandsDerived(hooksDocument) {
  for (const { label, command } of hookCommands(hooksDocument)) {
    const targets = commandTargets(command);
    assert.ok(targets.length > 0, label + " must include a ./-relative script target");

    for (const target of targets) {
      const artifactPath = packageRelativePath(nativePluginRoot, target, label);
      const sourcePath = packageRelativePath(portablePluginRoot, target, label);
      assert.equal(await exists(artifactPath), true, label + " target is absent from the artifact: " + target);
      assert.equal(await exists(sourcePath), true, label + " target is absent from plugin/: " + target);
      assert.deepEqual(
        await readFile(artifactPath),
        await readFile(sourcePath),
        label + " target drifted from plugin/: " + target,
      );
    }
  }
}

async function assertNoAbsolutePaths() {
  const distributableTextFiles = [
    ...(await filesInDirectory(nativePluginRoot)),
    nativeMarketplaceManifest,
  ];

  for (const file of distributableTextFiles) {
    const text = await readFile(file, "utf8");
    assert.doesNotMatch(
      text,
      absolutePathPattern,
      relative(nativePluginRoot, file) + " contains an absolute developer path",
    );
  }
}

const artifactRoot = await buildNativeCodexCompat();
assert.equal(artifactRoot, nativePluginRoot);

// There must be no portable entry point for the manifest selector to prefer.
assert.equal(await exists(resolve(nativePluginRoot, "plugin.json")), false);
assert.equal(await exists(resolve(nativePluginRoot, "mcp.json")), false);
assert.equal(await exists(resolve(nativePluginRoot, ".codex-plugin", "plugin.json")), true);

const [portableManifest, portableMcp, portableApp, portableHooks, legacyManifest, nativeMcp, nativeApp, nativeHooks, rootHooks, marketplace] = await Promise.all([
  readJson(resolve(portablePluginRoot, "plugin.json")),
  readJson(resolve(portablePluginRoot, "mcp.json")),
  readJson(resolve(portablePluginRoot, ".app.json")),
  readJson(resolve(portablePluginRoot, "hooks", "hooks.json")),
  readJson(resolve(nativePluginRoot, ".codex-plugin", "plugin.json")),
  readJson(resolve(nativePluginRoot, ".mcp.json")),
  readJson(resolve(nativePluginRoot, ".app.json")),
  readJson(resolve(nativePluginRoot, "hooks", "hooks.json")),
  readJson(resolve(nativePluginRoot, "hooks.json")),
  readJson(nativeMarketplaceManifest),
]);

assert.deepEqual(legacyManifest, createLegacyManifest(portableManifest));
for (const field of ["name", "version"]) {
  assert.equal(typeof legacyManifest[field], "string", "Legacy manifest " + field + " must be a string");
  assert.notEqual(legacyManifest[field].trim(), "", "Legacy manifest " + field + " must be non-empty");
}
assert.equal(typeof legacyManifest.interface?.displayName, "string", "Legacy manifest interface.displayName must be a string");
assert.notEqual(legacyManifest.interface.displayName.trim(), "", "Legacy manifest interface.displayName must be non-empty");

assert.equal(legacyManifest.skills, "./skills/");
assert.equal(legacyManifest.mcpServers, "./.mcp.json");
assert.equal(legacyManifest.apps, "./.app.json");
assert.equal(legacyManifest.hooks, "./hooks/hooks.json");
for (const [label, declaredResource] of [
  ["skills", legacyManifest.skills],
  ["mcpServers", legacyManifest.mcpServers],
  ["apps", legacyManifest.apps],
  ["hooks", legacyManifest.hooks],
  ...declaredInterfacePaths(legacyManifest.interface),
]) {
  await assertDeclaredArtifactPath(declaredResource, label);
}

assert.deepEqual(nativeMcp, createLegacyMcp(portableMcp));
assert.equal(
  portableMcp.mcpServers["visual-team"]?.url,
  hostedMcpUrl,
  "plugin/mcp.json must keep the hosted Render URL during M0 (intentional pin)",
);
for (const [serverName, sourceServer] of Object.entries(portableMcp.mcpServers)) {
  const generatedServer = nativeMcp.mcpServers[serverName];
  assert.ok(generatedServer, "Generated .mcp.json is missing " + serverName);
  assert.equal(
    generatedServer.type,
    sourceServer.type === "streamable-http" ? "http" : sourceServer.type,
    "Generated .mcp.json must translate " + serverName + " transport for the Legacy loader",
  );
}
assert.deepEqual(nativeApp, portableApp);
assert.deepEqual(nativeHooks, portableHooks);
assert.deepEqual(rootHooks, portableHooks);
assert.deepEqual(marketplace, {
  name: "visual-team-native",
  interface: { displayName: "Visual Team Native Compatibility" },
  plugins: [
    {
      name: "visual-team",
      source: { source: "local", path: "./visual-team" },
      policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
      category: "Productivity",
    },
  ],
});

const postToolUseEntries = nativeHooks.hooks?.PostToolUse;
assert.ok(Array.isArray(postToolUseEntries) && postToolUseEntries.length > 0, "hooks.json must declare PostToolUse entries");
for (const [index, entry] of postToolUseEntries.entries()) {
  assert.equal(entry.matcher, ".*", "PostToolUse[" + index + "] must use the match-all regex matcher");
}
const postToolUse = postToolUseEntries[0]?.hooks?.[0];
assert.equal(postToolUse?.type, "command");
assert.equal(postToolUse?.command, "node \"./hooks/record_codex_event.mjs\" PostToolUse");
assert.equal(postToolUse?.statusMessage, "Recording activity in Visual Team");

await Promise.all([
  assertDirectoryDerived(resolve(portablePluginRoot, "hooks"), resolve(nativePluginRoot, "hooks")),
  assertDirectoryDerived(resolve(portablePluginRoot, "skills"), resolve(nativePluginRoot, "skills")),
  assertDirectoryDerived(resolve(portablePluginRoot, "assets"), resolve(nativePluginRoot, "assets")),
]);
await assertHookCommandsDerived(nativeHooks);
await assertNoAbsolutePaths();

process.stdout.write("Verified native Codex compatibility package: " + nativePluginRoot + "\n");
