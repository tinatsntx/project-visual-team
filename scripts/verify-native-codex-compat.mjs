#!/usr/bin/env node
/** Focused static verification for the generated native Codex package. */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import {
  buildNativeCodexCompat,
  createLegacyManifest,
  nativeMarketplaceManifest,
  nativePluginRoot,
  portablePluginRoot,
} from "./build-native-codex-compat.mjs";

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

async function fileDigests(root) {
  const digests = new Map();

  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
      } else if (entry.isFile()) {
        const contents = await readFile(path);
        digests.set(relative(root, path).replaceAll("\\", "/"), createHash("sha256").update(contents).digest("hex"));
      }
    }
  }

  await walk(root);
  return digests;
}

function assertDirectoryDerived(source, artifact) {
  return Promise.all([fileDigests(source), fileDigests(artifact)]).then(([sourceDigests, artifactDigests]) => {
    assert.deepEqual(artifactDigests, sourceDigests, `${relative(portablePluginRoot, source)} drifted in the native artifact`);
  });
}

function declaredArtifactPath(relativePath) {
  assert.ok(relativePath.startsWith("./"), `Declared resource must be package-relative: ${relativePath}`);
  const path = resolve(nativePluginRoot, relativePath);
  const pathFromRoot = relative(nativePluginRoot, path);
  assert.ok(pathFromRoot === "" || (!pathFromRoot.startsWith(`..${sep}`) && pathFromRoot !== ".."), `Declared resource escapes the package: ${relativePath}`);
  return path;
}

const artifactRoot = await buildNativeCodexCompat();
assert.equal(artifactRoot, nativePluginRoot);

// There must be no portable entry point for the manifest selector to prefer.
assert.equal(await exists(resolve(nativePluginRoot, "plugin.json")), false);
assert.equal(await exists(resolve(nativePluginRoot, "mcp.json")), false);
assert.equal(await exists(resolve(nativePluginRoot, ".codex-plugin", "plugin.json")), true);

const [portableManifest, portableMcp, portableApp, portableHooks, legacyManifest, nativeMcp, nativeApp, nativeHooks, marketplace] = await Promise.all([
  readJson(resolve(portablePluginRoot, "plugin.json")),
  readJson(resolve(portablePluginRoot, "mcp.json")),
  readJson(resolve(portablePluginRoot, ".app.json")),
  readJson(resolve(portablePluginRoot, "hooks", "hooks.json")),
  readJson(resolve(nativePluginRoot, ".codex-plugin", "plugin.json")),
  readJson(resolve(nativePluginRoot, ".mcp.json")),
  readJson(resolve(nativePluginRoot, ".app.json")),
  readJson(resolve(nativePluginRoot, "hooks.json")),
  readJson(nativeMarketplaceManifest),
]);

assert.deepEqual(legacyManifest, createLegacyManifest(portableManifest));
assert.equal(legacyManifest.skills, "./skills/");
assert.equal(legacyManifest.mcpServers, "./.mcp.json");
assert.equal(legacyManifest.apps, "./.app.json");
for (const declaredResource of [legacyManifest.skills, legacyManifest.mcpServers, legacyManifest.apps]) {
  assert.equal(await exists(declaredArtifactPath(declaredResource)), true, `${declaredResource} is absent from the artifact`);
}
for (const assetPath of [legacyManifest.interface.composerIcon, legacyManifest.interface.logo]) {
  assert.equal(await exists(declaredArtifactPath(assetPath)), true, `${assetPath} is absent from the artifact`);
}
assert.deepEqual(nativeMcp, { mcpServers: portableMcp.mcpServers });
assert.equal(nativeMcp.mcpServers["visual-team"].url, "https://project-visual-team-mcp.onrender.com/mcp");
assert.deepEqual(nativeApp, portableApp);
assert.deepEqual(nativeHooks, portableHooks);
assert.deepEqual(marketplace, {
  name: "visual-team-native",
  interface: { displayName: "Visual Team Native Compatibility" },
  plugins: [
    {
      name: "visual-team",
      source: { source: "local", path: "./visual-team" },
    },
  ],
});

// Legacy Codex loads hook definitions from root hooks.json; the script stays
// in hooks/ and is quoted so a substituted PLUGIN_ROOT containing spaces is
// passed to node as one argument. This is static packaging evidence only.
const postToolUse = nativeHooks.hooks?.PostToolUse?.[0]?.hooks?.[0];
assert.equal(postToolUse?.type, "command");
assert.equal(postToolUse?.command, "node \"${PLUGIN_ROOT}/hooks/record_codex_event.mjs\" PostToolUse");
assert.equal(await exists(resolve(nativePluginRoot, "hooks", "record_codex_event.mjs")), true);

await Promise.all([
  assertDirectoryDerived(resolve(portablePluginRoot, "skills"), resolve(nativePluginRoot, "skills")),
  assertDirectoryDerived(resolve(portablePluginRoot, "assets"), resolve(nativePluginRoot, "assets")),
]);
assert.equal(
  await readFile(resolve(nativePluginRoot, "hooks", "record_codex_event.mjs"), "utf8"),
  await readFile(resolve(portablePluginRoot, "hooks", "record_codex_event.mjs"), "utf8"),
);

const distributableTextFiles = [
  resolve(nativePluginRoot, ".codex-plugin", "plugin.json"),
  resolve(nativePluginRoot, ".mcp.json"),
  resolve(nativePluginRoot, ".app.json"),
  resolve(nativePluginRoot, "hooks.json"),
];
for (const file of distributableTextFiles) {
  assert.doesNotMatch(await readFile(file, "utf8"), /[A-Za-z]:\\/, `${file} contains an absolute Windows path`);
}

process.stdout.write(`Verified native Codex compatibility package: ${nativePluginRoot}\n`);
