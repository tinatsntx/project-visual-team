#!/usr/bin/env node
/** Focused static verification for the generated native Codex package. */

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, readdir, readFile, rm, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { relative, resolve, sep } from "node:path";
import {
  buildNativeCodexCompat,
  createLegacyManifest,
  createLegacyMcp,
  nativeMarketplaceManifest,
  nativePluginRoot,
  portablePluginRoot,
  projectRoot,
} from "./build-native-codex-compat.mjs";

const developmentMcpUrl = "http://localhost:8787/mcp";
const hostedMcpUrl = "https://project-visual-team-mcp.onrender.com/mcp";
// Explicitly configured acceptance path: when set, plugin/mcp.json must pin
// this exact endpoint; unset, either documented default is accepted.
const acceptanceMcpUrl = process.env.VISUAL_TEAM_ACCEPTANCE_MCP_URL;
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

// The pinned discovery layer substitutes these placeholders with the installed
// plugin root before launch; both spellings map to the same root.
const pluginRootPlaceholders = ["${PLUGIN_ROOT}", "${CLAUDE_PLUGIN_ROOT}"];

function commandTargets(command) {
  const targets = [];
  const pattern = /(?:^|\s)(?:"([^"]+)"|'([^']+)'|(\S+))/g;
  for (const match of command.matchAll(pattern)) {
    const token = match[1] ?? match[2] ?? match[3];
    const quoted = match[1] !== undefined ? "double" : match[2] !== undefined ? "single" : "none";
    const placeholder = pluginRootPlaceholders.find((root) => token.startsWith(root + "/"));
    if (placeholder) {
      targets.push({ token, relativePath: "./" + token.slice(placeholder.length + 1), quoted });
    } else if (token.startsWith("./") || token.startsWith("../")) {
      targets.push({ token, relativePath: token, quoted, relativeToCwd: true });
    }
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

function substituteHookEnv(command, env) {
  let substituted = command;
  for (const [key, value] of Object.entries(env)) {
    substituted = substituted.replaceAll("${" + key + "}", value);
  }
  return substituted;
}

// Mirrors the pinned runner: cmd.exe /C "<command>" verbatim on Windows,
// sh -lc <command> elsewhere, with the task directory as cwd.
function runHookCommand(command, cwd, env, stdinText) {
  return new Promise((resolvePromise) => {
    const isWindows = process.platform === "win32";
    const program = isWindows ? process.env.COMSPEC || "cmd.exe" : process.env.SHELL || "/bin/sh";
    const args = isWindows ? ["/C", `"${command}"`] : ["-lc", command];
    const child = spawn(program, args, {
      cwd,
      env,
      windowsVerbatimArguments: isWindows,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => resolvePromise({ code: -1, stdout, stderr: String(error) }));
    child.on("close", (code) => resolvePromise({ code, stdout, stderr }));
    child.stdin.end(stdinText);
    setTimeout(() => child.kill(), 15_000).unref();
  });
}

async function assertHookCommandsDerived(hooksDocument) {
  for (const { label, command } of hookCommands(hooksDocument)) {
    const targets = commandTargets(command);
    const cwdTargets = targets.filter((target) => target.relativeToCwd);
    const rootedTargets = targets.filter((target) => !target.relativeToCwd);
    assert.equal(
      cwdTargets.length,
      0,
      label + " must not use cwd-relative targets; the hook cwd is the task directory: " +
        cwdTargets.map((target) => target.token).join(", "),
    );
    assert.ok(rootedTargets.length > 0, label + " must include a ${PLUGIN_ROOT}-rooted script target");

    for (const target of rootedTargets) {
      assert.equal(
        target.quoted,
        "double",
        label + " target must be double-quoted; the installed root may contain spaces: " + target.token,
      );
      const artifactPath = packageRelativePath(nativePluginRoot, target.relativePath, label);
      const sourcePath = packageRelativePath(portablePluginRoot, target.relativePath, label);
      assert.equal(await exists(artifactPath), true, label + " target is absent from the artifact: " + target.token);
      assert.equal(await exists(sourcePath), true, label + " target is absent from plugin/: " + target.token);
      assert.deepEqual(
        await readFile(artifactPath),
        await readFile(sourcePath),
        label + " target drifted from plugin/: " + target.token,
      );
    }
  }
}

// Local regression for the installed-path launch: replay the pinned
// substitution against a spaced install root, run the command through the
// platform shell from an unrelated cwd, and confirm the allowlisted event
// reaches a stub MCP endpoint. Not evidence of automatic native delivery.
async function assertHookLaunchCheck(hooksDocument) {
  const launchCheckRoot = resolve(projectRoot, "dist", "launch-check");
  const installedRoot = resolve(launchCheckRoot, "installed plugin with spaces");
  const pluginDataRoot = resolve(launchCheckRoot, "plugin data");
  const foreignCwd = resolve(launchCheckRoot, "foreign task cwd");
  const allowlistedPayloadKeys = ["session_id", "turn_id", "agent_id", "agent_type", "tool_name"];

  const requests = [];
  const server = createServer((request, response) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      try {
        requests.push(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        requests.push(null);
      }
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ jsonrpc: "2.0", result: {} }));
    });
  });
  await new Promise((resolvePromise) => server.listen(0, "127.0.0.1", resolvePromise));

  try {
    await rm(launchCheckRoot, { recursive: true, force: true });
    await Promise.all([
      cp(nativePluginRoot, installedRoot, { recursive: true }),
      mkdir(pluginDataRoot, { recursive: true }),
      mkdir(foreignCwd, { recursive: true }),
    ]);

    const hookEnv = {
      PLUGIN_ROOT: installedRoot,
      CLAUDE_PLUGIN_ROOT: installedRoot,
      PLUGIN_DATA: pluginDataRoot,
      CLAUDE_PLUGIN_DATA: pluginDataRoot,
    };
    const port = server.address().port;
    const childEnv = {
      ...process.env,
      VISUAL_TEAM_MCP_URL: `http://127.0.0.1:${port}/mcp`,
      VISUAL_TEAM_TASK_ID: "vt_launch_check",
    };

    for (const { label, command } of hookCommands(hooksDocument)) {
      const substituted = substituteHookEnv(command, hookEnv);
      assert.ok(!substituted.includes("${"), label + " has an unresolved placeholder: " + substituted);
      const result = await runHookCommand(
        substituted,
        foreignCwd,
        childEnv,
        JSON.stringify({
          session_id: "launch-check-session",
          tool_name: "shell",
          tool_input: { command: "echo secret-marker" },
          transcript_path: "C:/secret/transcript.jsonl",
        }),
      );
      assert.equal(
        result.code,
        0,
        label + " launch check failed: " + JSON.stringify({ stdout: result.stdout, stderr: result.stderr }),
      );
    }

    const toolCall = requests.find(
      (request) => request && request.method === "tools/call" && request.params?.name === "record_codex_event",
    );
    assert.ok(toolCall, "hook launch check delivered no record_codex_event call");
    const args = toolCall.params.arguments;
    assert.equal(args.name, "PostToolUse");
    assert.equal(args.taskId, "vt_launch_check");
    assert.equal(args.payload.session_id, "launch-check-session");
    assert.equal(args.payload.tool_name, "shell");
    for (const key of Object.keys(args.payload)) {
      assert.ok(allowlistedPayloadKeys.includes(key), "hook forwarded a non-allowlisted payload key: " + key);
    }
    const serialized = JSON.stringify(toolCall);
    assert.ok(
      !serialized.includes("secret-marker") && !serialized.includes("transcript"),
      "hook forwarded non-allowlisted payload content",
    );
  } finally {
    server.close();
    await rm(launchCheckRoot, { recursive: true, force: true });
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
const sourceMcpUrl = portableMcp.mcpServers["visual-team"]?.url;
if (acceptanceMcpUrl) {
  assert.equal(
    sourceMcpUrl,
    acceptanceMcpUrl,
    "plugin/mcp.json visual-team URL must equal VISUAL_TEAM_ACCEPTANCE_MCP_URL",
  );
} else {
  assert.ok(
    [developmentMcpUrl, hostedMcpUrl].includes(sourceMcpUrl),
    "plugin/mcp.json visual-team URL must be a documented endpoint: the localhost development default or the hosted M0 deployment",
  );
}
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
assert.equal(postToolUse?.command, "node \"${PLUGIN_ROOT}/hooks/record_codex_event.mjs\" PostToolUse");
assert.equal(postToolUse?.statusMessage, "Recording activity in Visual Team");

await Promise.all([
  assertDirectoryDerived(resolve(portablePluginRoot, "hooks"), resolve(nativePluginRoot, "hooks")),
  assertDirectoryDerived(resolve(portablePluginRoot, "skills"), resolve(nativePluginRoot, "skills")),
  assertDirectoryDerived(resolve(portablePluginRoot, "assets"), resolve(nativePluginRoot, "assets")),
]);
await assertHookCommandsDerived(nativeHooks);
await assertHookLaunchCheck(nativeHooks);
await assertNoAbsolutePaths();

process.stdout.write("Verified native Codex compatibility package: " + nativePluginRoot + "\n");
