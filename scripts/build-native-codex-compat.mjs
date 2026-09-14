#!/usr/bin/env node
/**
 * Generates the legacy Codex compatibility package from the portable plugin
 * source. The generated root intentionally has no root plugin.json: Codex
 * 0.149.0 and 0.154.0-alpha select the Legacy loader only in that shape.
 */

import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
export const projectRoot = resolve(scriptDirectory, "..");
export const portablePluginRoot = resolve(projectRoot, "plugin");
export const outputDirectory = resolve(projectRoot, "dist", "native-codex-compat");
export const nativePluginRoot = resolve(outputDirectory, "visual-team");
export const nativeMarketplaceManifest = resolve(outputDirectory, ".agents", "plugins", "marketplace.json");

const legacyPassthroughFields = [
  "name",
  "version",
  "description",
  "author",
  "homepage",
  "repository",
  "license",
  "keywords",
];

function ensureWithinProject(path) {
  const pathFromProject = relative(projectRoot, path);
  if (pathFromProject === "" || pathFromProject.startsWith(`..${sep}`) || pathFromProject === "..") {
    throw new Error(`Refusing to write outside the project: ${path}`);
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

/**
 * Projects the portable manifest's shared metadata and OpenAI interface into
 * the Legacy manifest accepted by the tested native loaders.
 */
export function createLegacyManifest(portableManifest) {
  const interfaceConfig = portableManifest.extensions?.["com.openai"]?.interface;
  if (!interfaceConfig) {
    throw new Error("Portable manifest is missing extensions.com.openai.interface");
  }

  const legacyManifest = {};
  for (const field of legacyPassthroughFields) {
    if (portableManifest[field] !== undefined) {
      legacyManifest[field] = portableManifest[field];
    }
  }

  return {
    ...legacyManifest,
    skills: "./skills/",
    mcpServers: "./.mcp.json",
    apps: "./.app.json",
    hooks: "./hooks/hooks.json",
    interface: interfaceConfig,
  };
}

/**
 * Legacy .mcp.json uses the historical HTTP transport spelling, while the
 * portable Agent Plugins source keeps its streamable-http declaration.
 */
export function createLegacyMcp(portableMcp) {
  return {
    mcpServers: Object.fromEntries(
      Object.entries(portableMcp.mcpServers).map(([serverName, server]) => [
        serverName,
        server?.type === "streamable-http" ? { ...server, type: "http" } : server,
      ]),
    ),
  };
}

function createNativeMarketplace() {
  return {
    name: "visual-team-native",
    interface: {
      displayName: "Visual Team Native Compatibility",
    },
    plugins: [
      {
        name: "visual-team",
        source: {
          source: "local",
          path: "./visual-team",
        },
        policy: {
          installation: "AVAILABLE",
          authentication: "ON_INSTALL",
        },
        category: "Productivity",
      },
    ],
  };
}

export async function buildNativeCodexCompat() {
  ensureWithinProject(outputDirectory);
  ensureWithinProject(nativePluginRoot);

  const [portableManifest, portableMcp] = await Promise.all([
    readJson(resolve(portablePluginRoot, "plugin.json")),
    readJson(resolve(portablePluginRoot, "mcp.json")),
  ]);

  if (!portableMcp.mcpServers) {
    throw new Error("Portable mcp.json is missing mcpServers");
  }

  // Recreate a known workspace-local output rather than modifying a cache.
  await rm(outputDirectory, { recursive: true, force: true });
  await Promise.all([
    mkdir(resolve(nativePluginRoot, ".codex-plugin"), { recursive: true }),
    mkdir(dirname(nativeMarketplaceManifest), { recursive: true }),
  ]);

  await Promise.all([
    cp(resolve(portablePluginRoot, ".app.json"), resolve(nativePluginRoot, ".app.json")),
    cp(resolve(portablePluginRoot, "hooks"), resolve(nativePluginRoot, "hooks"), { recursive: true }),
    // Keep a root copy for real-plugin conventions that drift from the pinned
    // loaders. The manifest's hooks path remains the deterministic one.
    cp(resolve(portablePluginRoot, "hooks", "hooks.json"), resolve(nativePluginRoot, "hooks.json")),
    cp(resolve(portablePluginRoot, "skills"), resolve(nativePluginRoot, "skills"), { recursive: true }),
    cp(resolve(portablePluginRoot, "assets"), resolve(nativePluginRoot, "assets"), { recursive: true }),
  ]);

  await Promise.all([
    writeJson(resolve(nativePluginRoot, ".codex-plugin", "plugin.json"), createLegacyManifest(portableManifest)),
    // The Legacy loader's MCP convention is .mcp.json rather than mcp.json.
    writeJson(resolve(nativePluginRoot, ".mcp.json"), createLegacyMcp(portableMcp)),
    writeJson(nativeMarketplaceManifest, createNativeMarketplace()),
  ]);

  return nativePluginRoot;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildNativeCodexCompat()
    .then((artifactRoot) => process.stdout.write(`Generated native Codex compatibility package: ${artifactRoot}\n`))
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.stack : error}\n`);
      process.exitCode = 1;
    });
}
