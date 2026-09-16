import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo, Server } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import { buildAlphaPackage } from "../scripts/build-alpha-package.mjs";

/**
 * Guided alpha package (brief 012). Cross-platform checks verify the
 * generated layout and integrity manifest; the install.ps1/doctor.ps1
 * decision tests run only on Windows with a stubbed codex.cmd on PATH and a
 * stubbed /healthz — real CLI/PS execution against controlled JSON shapes,
 * not static-string assertions. Nothing here touches a real Codex profile,
 * plugin cache, or trust state.
 */

const IS_WINDOWS = process.platform === "win32";
const POWERSHELL =
  IS_WINDOWS && spawnSync("where.exe", ["powershell.exe"]).status === 0
    ? spawnSync("where.exe", ["powershell.exe"]).stdout.toString().split(/\r?\n/)[0].trim()
    : null;
// Isolated PATH for the stubbed runs: our codex.cmd, real node (prerequisite
// check must genuinely pass), and System32 (cmd.exe launches the stub).
const SYSTEM32 = process.env.SystemRoot ? join(process.env.SystemRoot, "System32") : "C:\\Windows\\System32";
const STUB_PATH = (binDir: string) => `${binDir};${join(process.execPath, "..")};${SYSTEM32}`;
// The controlled PS 5.1 child needs its own module path: inheriting the
// parent's can hide Microsoft.PowerShell.Utility (Get-FileHash) and fail the
// integrity check before the CLI is ever reached.
const STUB_PSMODULEPATH = join(SYSTEM32, "WindowsPowerShell", "v1.0", "Modules");

// ---------------------------------------------------------------------------
// Cross-platform package checks
// ---------------------------------------------------------------------------

describe("alpha package layout", () => {
  it("builds a complete, hash-consistent package from current source", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "vt-alpha-build-"));
    try {
      const outDir = join(tmp, "pkg");
      await buildAlphaPackage({ outDir });
      for (const rel of [
        "install.ps1",
        "doctor.ps1",
        "vt-alpha-common.ps1",
        "README.txt",
        "integrity.json",
        ".agents/plugins/marketplace.json",
        "visual-team/.codex-plugin/plugin.json",
        "visual-team/.mcp.json",
        "visual-team/hooks/record_codex_event.mjs",
        "visual-team/skills/visual-team/SKILL.md",
      ]) {
        assert.ok(existsSync(join(outDir, rel)), `packaged file missing: ${rel}`);
      }
      const manifest = JSON.parse(readFileSync(join(outDir, "integrity.json"), "utf8"));
      assert.equal(manifest.algorithm, "sha256");
      assert.match(manifest.sourceRevision, /^[0-9a-f]{40}$|^unverified-preview$/);
      assert.equal(manifest.pluginVersion, "0.1.0");
      assert.equal(manifest.testedRuntime, "codex-cli 0.154.0-alpha.6.2");
      for (const [rel, hex] of Object.entries<string>(manifest.files)) {
        const actual = createHash("sha256").update(readFileSync(join(outDir, rel))).digest("hex");
        assert.equal(actual, hex, `integrity mismatch for ${rel}`);
      }
      // The manifest never lists itself.
      assert.equal(manifest.files["integrity.json"], undefined);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Windows-only installer/doctor behavior against controlled CLI stubs
// ---------------------------------------------------------------------------

// A Windows-quoted path is not JSON-safe inside a .cmd echo; the stub logs
// full invocations to VT_STUB_LOG and answers with fixed valid JSON served
// from state files. Flat if/goto dispatch only: nested parenthesized blocks
// made cmd.exe swallow a nonzero exit /b in this shape (list returned 0 even
// with VT_STUB_EXIT=3), which falsely passed the CLI-failure path.
const STUB_CMD = `@echo off
if "%~1"=="--version" goto version
if not "%~1"=="plugin" exit /b 2
echo %* >> "%VT_STUB_LOG%"
if "%~2"=="marketplace" goto marketplace
if "%~2"=="list" goto plist
if "%~2"=="add" goto padd
exit /b 2
:version
if exist "%~dp0version.txt" goto versionfile
echo codex-cli %VT_STUB_VERSION%
exit /b 0
:versionfile
type "%~dp0version.txt"
exit /b 0
:marketplace
if "%~3"=="list" goto mlist
if "%~3"=="add" goto madd
exit /b 2
:mlist
type "%VT_STUB_DIR%\\marketplace.json"
exit /b %VT_STUB_EXIT%
:madd
type "%VT_STUB_DIR%\\added.json"
if exist "%VT_STUB_DIR%\\post-marketplace.json" copy /y "%VT_STUB_DIR%\\post-marketplace.json" "%VT_STUB_DIR%\\marketplace.json" >nul
exit /b %VT_STUB_ADD_EXIT%
:plist
type "%VT_STUB_DIR%\\plugins.json"
exit /b %VT_STUB_EXIT%
:padd
type "%VT_STUB_DIR%\\added.json"
if exist "%VT_STUB_DIR%\\post-plugins.json" copy /y "%VT_STUB_DIR%\\post-plugins.json" "%VT_STUB_DIR%\\plugins.json" >nul
exit /b %VT_STUB_ADD_EXIT%
`;

interface PsRun {
  code: number | null;
  stdout: string;
  stderr: string;
}

interface Fixture {
  root: string;
  pkg: string;
  binDir: string;
  stubDir: string;
  log: string;
  healthPort: number;
  server: Server;
}

function writeStubState(
  fx: Fixture,
  opts: {
    marketplaces?: unknown[] | Record<string, unknown>;
    installed?: unknown[] | Record<string, unknown>;
    available?: unknown[];
    /** State the CLI reports AFTER a successful add (models the real mutation). */
    postMarketplaces?: unknown[];
    postInstalled?: unknown[];
    postAvailable?: unknown[];
  },
) {
  writeFileSync(
    join(fx.stubDir, "marketplace.json"),
    JSON.stringify(
      opts.marketplaces !== undefined && !Array.isArray(opts.marketplaces)
        ? opts.marketplaces
        : { marketplaces: opts.marketplaces ?? [] },
    ),
  );
  writeFileSync(
    join(fx.stubDir, "plugins.json"),
    JSON.stringify(
      opts.installed !== undefined && !Array.isArray(opts.installed)
        ? opts.installed
        : { installed: opts.installed ?? [], available: opts.available ?? [] },
    ),
  );
  writeFileSync(join(fx.stubDir, "added.json"), JSON.stringify({ added: true }));
  if (opts.postMarketplaces) {
    writeFileSync(join(fx.stubDir, "post-marketplace.json"), JSON.stringify({ marketplaces: opts.postMarketplaces }));
  }
  if (opts.postInstalled || opts.postAvailable) {
    writeFileSync(
      join(fx.stubDir, "post-plugins.json"),
      JSON.stringify({ installed: opts.postInstalled ?? [], available: opts.postAvailable ?? [] }),
    );
  }
}

/** The installed entry this package's installer expects the CLI to record. */
function installedEntry(fx: Fixture, over: Record<string, unknown> = {}) {
  return {
    name: "visual-team",
    version: "0.1.0",
    enabled: true,
    source: { path: join(fx.pkg, "visual-team") },
    marketplaceSource: { sourceType: "local", source: fx.pkg },
    marketplace: "visual-team-native",
    ...over,
  };
}

/**
 * A real remote-installed plugin as the real CLI reports it — source carries
 * {source:"remote", id} with no local path. Observed on codex-cli
 * 0.154.0-alpha.6.2 (e.g. the official gmail plugin); these entries are valid
 * and must never be read as malformed or as ours.
 */
function remoteEntry(over: Record<string, unknown> = {}) {
  return {
    name: "gmail",
    version: "0.1.10",
    enabled: true,
    source: { source: "remote", id: "com.openai.gmail" },
    marketplaceSource: null,
    marketplace: "core",
    ...over,
  };
}

/** A desktop-bundled codex stub at LOCALAPPDATA\OpenAI\Codex\bin\<build>\. */
function desktopStub(fx: Fixture, build: string, version?: string): string {
  const dir = join(fx.stubDir, "localappdata", "OpenAI", "Codex", "bin", build);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "codex.cmd"), STUB_CMD);
  if (version) writeFileSync(join(dir, "version.txt"), `codex-cli ${version}\n`);
  return join(dir, "codex.cmd");
}

async function makeFixture(): Promise<Fixture> {
  const root = mkdtempSync(join(tmpdir(), "vt-alpha-install-"));
  const pkg = join(root, "pkg");
  const binDir = join(root, "bin");
  const stubDir = join(root, "stub");
  mkdirSync(binDir, { recursive: true });
  mkdirSync(stubDir, { recursive: true });
  writeFileSync(join(binDir, "codex.cmd"), STUB_CMD);
  await buildAlphaPackage({ outDir: pkg });
  return { root, pkg, binDir, stubDir, log: join(stubDir, "invocations.log"), healthPort: 0, server: null as unknown as Server };
}

/** Repoint the packaged endpoint at the stub /healthz and re-hash it. */
function pairEndpoint(fx: Fixture, url: string) {
  const mcpPath = join(fx.pkg, "visual-team", ".mcp.json");
  const doc = JSON.parse(readFileSync(mcpPath, "utf8"));
  doc.mcpServers["visual-team"].url = url;
  writeFileSync(mcpPath, JSON.stringify(doc, null, 2));
  const manifestPath = join(fx.pkg, "integrity.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.files["visual-team/.mcp.json"] = createHash("sha256").update(readFileSync(mcpPath)).digest("hex");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

async function startHealth(fx: Fixture): Promise<number> {
  const server = createServer((req, res) => {
    if (req.url === "/healthz") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } else {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  fx.server = server;
  fx.healthPort = (server.address() as AddressInfo).port;
  return fx.healthPort;
}

function runPs(
  fx: Fixture,
  script: "install.ps1" | "doctor.ps1",
  extra: string[] = [],
  overrides: Record<string, string> = {},
): Promise<PsRun> {
  const env = {
    ...process.env,
    PATH: STUB_PATH(fx.binDir),
    // Controlled module path: System32's PS5.1 modules only (review §6.1).
    PSModulePath: STUB_PSMODULEPATH,
    // Controlled desktop-bundle root: the fixture's own, never the real one.
    LOCALAPPDATA: join(fx.stubDir, "localappdata"),
    VT_STUB_DIR: fx.stubDir,
    VT_STUB_LOG: fx.log,
    VT_STUB_VERSION: "0.154.0-alpha.6.2",
    VT_STUB_EXIT: "0",
    VT_STUB_ADD_EXIT: "0",
    ...overrides,
  };
  // The endpoint override must not leak from the ambient environment: the
  // hook treats any DEFINED value as the destination, so a parent-set
  // variable would silently change every scripted run. Tests opt in via
  // overrides.
  if (!("VISUAL_TEAM_MCP_URL" in overrides)) delete env.VISUAL_TEAM_MCP_URL;
  return new Promise((resolvePromise) => {
    const child = spawn(
      POWERSHELL!,
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", join(fx.pkg, script), ...extra],
      { env, cwd: fx.pkg },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => (stdout += c));
    child.stderr.on("data", (c) => (stderr += c));
    child.on("error", (e) => resolvePromise({ code: -1, stdout, stderr: String(e) }));
    child.on("close", (code) => resolvePromise({ code, stdout, stderr }));
    setTimeout(() => child.kill(), 60_000).unref();
  });
}

function invocations(fx: Fixture): string[] {
  if (!existsSync(fx.log)) return [];
  // `echo %*` leaves a trailing space; trim so assertions compare real argv.
  return readFileSync(fx.log, "utf8").split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean);
}

const describeWindows = IS_WINDOWS && POWERSHELL ? describe : describe.skip;

describeWindows("alpha installer/doctor against a stubbed codex", () => {
  it("fresh install registers the marketplace and plugin, verifies by re-query, then repeats as a no-op", async () => {
    const fx = await makeFixture();
    try {
      const port = await startHealth(fx);
      pairEndpoint(fx, `http://127.0.0.1:${port}/mcp`);
      // The stub models the real CLI: after an add, subsequent list calls
      // report the newly recorded state.
      // The real CLI also lists unrelated remote-installed plugins — valid
      // entries with no local source path; they must not break the state read.
      writeStubState(fx, {
        installed: [remoteEntry()],
        postMarketplaces: [{ name: "visual-team-native", root: fx.pkg }],
        postInstalled: [remoteEntry(), installedEntry(fx)],
      });

      const first = await runPs(fx, "install.ps1");
      assert.equal(first.code, 0, first.stdout + first.stderr);
      assert.match(first.stdout, /added local marketplace/);
      assert.match(first.stdout, /installed visual-team@visual-team-native/);
      assert.match(first.stdout, /identity confirmed by re-query/);
      assert.match(first.stdout, /\/hooks/);

      // Exact argv: the supported query and add commands, nothing else.
      const calls = invocations(fx);
      assert.ok(calls.length >= 4, `expected >=4 CLI calls, saw ${calls.length}: ${calls.join(" | ")}`);
      assert.equal(calls[0], "plugin marketplace list --json");
      assert.equal(calls[1], "plugin list --available --json");
      assert.match(calls[2], /^plugin marketplace add .+ --json$/);
      assert.equal(calls[3], "plugin add visual-team@visual-team-native --json");
      // Readback: both list queries run again after the adds.
      assert.deepEqual(calls.slice(4), ["plugin marketplace list --json", "plugin list --available --json"]);

      // Now the CLI reports the install — rerun must change nothing.
      const addsAfterFirst = calls.filter((l) => / add /.test(l)).length;
      const second = await runPs(fx, "install.ps1");
      assert.equal(second.code, 0, second.stdout + second.stderr);
      assert.match(second.stdout, /no change/);
      const addsAfterSecond = invocations(fx).filter((l) => / add /.test(l)).length;
      assert.equal(addsAfterSecond, addsAfterFirst, "identical rerun must not re-add");
    } finally {
      fx.server?.close();
      rmSync(fx.root, { recursive: true, force: true });
    }
  });

  it("stops on an enabled foreign-source visual-team before any mutation — even with the marketplace absent", async () => {
    const fx = await makeFixture();
    try {
      const port = await startHealth(fx);
      pairEndpoint(fx, `http://127.0.0.1:${port}/mcp`);
      // Marketplace NOT registered: conflict detection must finish before the
      // installer adds anything, so the log must show zero add invocations.
      writeStubState(fx, {
        installed: [installedEntry(fx, { version: "9.9.9", source: { path: "C:\\other\\visual-team" }, marketplaceSource: { sourceType: "local", source: "C:\\other" }, marketplace: null })],
      });
      const result = await runPs(fx, "install.ps1");
      assert.equal(result.code, 1);
      assert.match(result.stdout, /different source/);
      assert.match(result.stdout, /never disables or replaces/);
      assert.equal(invocations(fx).filter((l) => / add /.test(l)).length, 0);
      // Both reads happened — the conflict was found from state, not from a failed add.
      assert.ok(invocations(fx).includes("plugin marketplace list --json"));
      assert.ok(invocations(fx).includes("plugin list --available --json"));
    } finally {
      fx.server?.close();
      rmSync(fx.root, { recursive: true, force: true });
    }
  });

  it("an enabled remote-sourced visual-team is a foreign-source conflict, detected before mutation", async () => {
    const fx = await makeFixture();
    try {
      const port = await startHealth(fx);
      pairEndpoint(fx, `http://127.0.0.1:${port}/mcp`);
      // A remote install has no local source.path — differently sourced, so
      // enabled duplicate detection must still catch it before any add.
      writeStubState(fx, {
        installed: [remoteEntry({ name: "visual-team", source: { source: "remote", id: "third-party.visual-team" }, marketplace: "other-mp" })],
      });
      const result = await runPs(fx, "install.ps1");
      assert.equal(result.code, 1);
      assert.match(result.stdout, /different source/);
      assert.equal(invocations(fx).filter((l) => / add /.test(l)).length, 0);
    } finally {
      fx.server?.close();
      rmSync(fx.root, { recursive: true, force: true });
    }
  });

  it("same source.path and version with a different marketplaceSource is not ours — enabled is a conflict", async () => {
    const fx = await makeFixture();
    try {
      const port = await startHealth(fx);
      pairEndpoint(fx, `http://127.0.0.1:${port}/mcp`);
      // Path + version match is not identity: the marketplace source differs.
      writeStubState(fx, {
        installed: [installedEntry(fx, { marketplaceSource: { sourceType: "local", source: "C:\\different-package" } })],
      });
      const result = await runPs(fx, "install.ps1");
      assert.equal(result.code, 1);
      assert.match(result.stdout, /different source/);
      assert.equal(invocations(fx).filter((l) => / add /.test(l)).length, 0);
    } finally {
      fx.server?.close();
      rmSync(fx.root, { recursive: true, force: true });
    }
  });

  it("a successful add whose readback carries a different marketplaceSource fails verification", async () => {
    const fx = await makeFixture();
    try {
      const port = await startHealth(fx);
      pairEndpoint(fx, `http://127.0.0.1:${port}/mcp`);
      // The CLI accepts the add but records a different marketplace source —
      // name + path + version alone do not prove this package's install.
      writeStubState(fx, {
        postMarketplaces: [{ name: "visual-team-native", root: fx.pkg }],
        postInstalled: [installedEntry(fx, { marketplaceSource: { sourceType: "local", source: "C:\\different-package" } })],
      });
      const result = await runPs(fx, "install.ps1");
      assert.equal(result.code, 1, result.stdout + result.stderr);
      assert.match(result.stdout, /post-install verification failed/);
    } finally {
      fx.server?.close();
      rmSync(fx.root, { recursive: true, force: true });
    }
  });

  it("a disabled alternate is a note, not a conflict", async () => {
    const fx = await makeFixture();
    try {
      const port = await startHealth(fx);
      pairEndpoint(fx, `http://127.0.0.1:${port}/mcp`);
      writeStubState(fx, {
        marketplaces: [{ name: "visual-team-native", root: fx.pkg }],
        installed: [
          installedEntry(fx),
          installedEntry(fx, { version: "9.9.9", enabled: false, source: { path: "C:\\other\\visual-team" }, marketplaceSource: { sourceType: "local", source: "C:\\other" }, marketplace: null }),
        ],
      });
      const result = await runPs(fx, "install.ps1");
      assert.equal(result.code, 0, result.stdout);
      assert.match(result.stdout, /disabled install from another source/);
    } finally {
      fx.server?.close();
      rmSync(fx.root, { recursive: true, force: true });
    }
  });

  it("rejects integrity mismatches, endpoint failures, and bad CLI states", async () => {
    const fx = await makeFixture();
    try {
      // Corrupt a packaged file after hashing.
      writeFileSync(join(fx.pkg, "README.txt"), "tampered");
      const bad = await runPs(fx, "install.ps1");
      assert.equal(bad.code, 1);
      assert.match(bad.stdout, /integrity check failed/);
      assert.equal(invocations(fx).length, 0, "integrity failure must stop before any CLI mutation");
    } finally {
      rmSync(fx.root, { recursive: true, force: true });
    }

    const fx2 = await makeFixture();
    try {
      pairEndpoint(fx2, "http://127.0.0.1:1/mcp"); // nothing listens
      writeStubState(fx2, {});
      const dead = await runPs(fx2, "install.ps1");
      assert.equal(dead.code, 1);
      assert.match(dead.stdout, /not reachable/);
      assert.equal(invocations(fx2).filter((l) => / add /.test(l)).length, 0);
    } finally {
      rmSync(fx2.root, { recursive: true, force: true });
    }
  });

  it("doctor is read-only and reports each check without mutating", async () => {
    const fx = await makeFixture();
    try {
      const port = await startHealth(fx);
      pairEndpoint(fx, `http://127.0.0.1:${port}/mcp`);
      writeStubState(fx, {
        marketplaces: [{ name: "visual-team-native", root: fx.pkg }],
        installed: [installedEntry(fx)],
      });
      const result = await runPs(fx, "doctor.ps1");
      assert.equal(result.code, 0, result.stdout + result.stderr);
      assert.match(result.stdout, /PASS\] package integrity/);
      assert.match(result.stdout, /PASS\] node/);
      assert.match(result.stdout, /PASS\] codex cli/);
      assert.match(result.stdout, /PASS\] service health/);
      assert.match(result.stdout, /PASS\] marketplace/);
      assert.match(result.stdout, /PASS\] plugin/);
      assert.match(result.stdout, /not proof of hook delivery/);
      // With no override defined, doctor reports the hook uses the packaged endpoint.
      assert.match(result.stdout, /VISUAL_TEAM_MCP_URL is not set/);
      // Doctor may list but must never add/remove/trust.
      for (const line of invocations(fx)) {
        assert.doesNotMatch(line, /add|remove|disable|enable/);
      }
    } finally {
      fx.server?.close();
      rmSync(fx.root, { recursive: true, force: true });
    }
  });

  it("stops with actionable guidance when the codex version is unsupported", async () => {
    const fx = await makeFixture();
    try {
      const port = await startHealth(fx);
      pairEndpoint(fx, `http://127.0.0.1:${port}/mcp`);
      writeStubState(fx, {});
      const child = spawnSync(
        POWERSHELL!,
        ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", join(fx.pkg, "install.ps1")],
        {
          env: {
            ...process.env,
            PATH: STUB_PATH(fx.binDir),
            VT_STUB_DIR: fx.stubDir,
            VT_STUB_LOG: fx.log,
            VT_STUB_VERSION: "0.200.0-different",
            VT_STUB_EXIT: "0",
            VT_STUB_ADD_EXIT: "0",
          },
          cwd: fx.pkg,
          encoding: "utf8",
        },
      );
      assert.equal(child.status, 1);
      assert.match(child.stdout, /0\.154\.0-alpha\.6\.2/);
      assert.equal(invocations(fx).filter((l) => / add /.test(l)).length, 0);
    } finally {
      fx.server?.close();
      rmSync(fx.root, { recursive: true, force: true });
    }
  });

  it("reports absent and ambiguous codex discovery with actionable guidance", async () => {
    const fx = await makeFixture();
    try {
      const port = await startHealth(fx);
      pairEndpoint(fx, `http://127.0.0.1:${port}/mcp`);
      // Post-add state lets the -CodexPath happy path pass readback.
      writeStubState(fx, {
        postMarketplaces: [{ name: "visual-team-native", root: fx.pkg }],
        postInstalled: [installedEntry(fx)],
      });
      const emptyBin = join(fx.root, "empty-bin");
      mkdirSync(emptyBin);
      const absent = await runPs(fx, "install.ps1", [], { PATH: STUB_PATH(emptyBin) });
      assert.equal(absent.code, 1);
      assert.match(absent.stdout, /no codex executable found/);
      assert.match(absent.stdout, /0\.154\.0-alpha\.6\.2/);

      // Ambiguous: a second bin dir holding its own tested-version codex.cmd.
      const bin2 = join(fx.root, "bin2");
      mkdirSync(bin2);
      cpSync(join(fx.binDir, "codex.cmd"), join(bin2, "codex.cmd"));
      const ambiguous = await runPs(fx, "install.ps1", [], {
        PATH: `${fx.binDir};${bin2};${join(process.execPath, "..")};${SYSTEM32}`,
      });
      assert.equal(ambiguous.code, 1);
      assert.match(ambiguous.stdout, /more than one codex/);
      assert.match(ambiguous.stdout, /-CodexPath/);

      // Explicit -CodexPath resolves the same ambiguity deterministically.
      const explicit = await runPs(fx, "install.ps1", ["-CodexPath", join(fx.binDir, "codex.cmd")], {
        PATH: `${fx.binDir};${bin2};${join(process.execPath, "..")};${SYSTEM32}`,
      });
      assert.equal(explicit.code, 0, explicit.stdout + explicit.stderr);
      assert.match(explicit.stdout, /-CodexPath/);
    } finally {
      fx.server?.close();
      rmSync(fx.root, { recursive: true, force: true });
    }
  });

  it("discovers the desktop-bundled runtime and never substitutes an unsupported PATH wrapper", async () => {
    const fx = await makeFixture();
    try {
      const port = await startHealth(fx);
      pairEndpoint(fx, `http://127.0.0.1:${port}/mcp`);
      writeStubState(fx, {
        marketplaces: [{ name: "visual-team-native", root: fx.pkg }],
        installed: [installedEntry(fx)],
      });
      const emptyBin = join(fx.root, "no-path-bin");
      mkdirSync(emptyBin);

      // One tested desktop candidate, no PATH codex at all.
      desktopStub(fx, "buildA", "0.154.0-alpha.6.2");
      const desktopOnly = await runPs(fx, "install.ps1", [], { PATH: STUB_PATH(emptyBin) });
      assert.equal(desktopOnly.code, 0, desktopOnly.stdout + desktopOnly.stderr);
      assert.match(desktopOnly.stdout, /via discovered/);

      // An unsupported global wrapper beside it is not a substitute and does
      // not shadow the one tested desktop candidate.
      const wrapperBin = join(fx.root, "wrapper-bin");
      mkdirSync(wrapperBin);
      writeFileSync(join(wrapperBin, "codex.cmd"), STUB_CMD);
      writeFileSync(join(wrapperBin, "version.txt"), "codex-cli 0.149.0\n");
      const wrapper = await runPs(fx, "install.ps1", [], { PATH: STUB_PATH(wrapperBin) });
      assert.equal(wrapper.code, 0, wrapper.stdout + wrapper.stderr);
      assert.match(wrapper.stdout, /via discovered/);
      assert.match(wrapper.stdout, /OpenAI\\Codex\\bin\\buildA/i);

      // Two matching desktop builds require explicit selection.
      desktopStub(fx, "buildB", "0.154.0-alpha.6.2");
      const two = await runPs(fx, "install.ps1", [], { PATH: STUB_PATH(emptyBin) });
      assert.equal(two.code, 1);
      assert.match(two.stdout, /more than one codex matches the tested runtime/);
      assert.match(two.stdout, /-CodexPath/);
      assert.equal(invocations(fx).filter((l) => / add /.test(l)).length, 0);

      // Only an unsupported desktop build remains a refusal, listing what it saw.
      rmSync(join(fx.stubDir, "localappdata", "OpenAI", "Codex", "bin", "buildB"), { recursive: true, force: true });
      writeFileSync(join(fx.stubDir, "localappdata", "OpenAI", "Codex", "bin", "buildA", "version.txt"), "codex-cli 0.130.0\n");
      const unsupported = await runPs(fx, "install.ps1", [], { PATH: STUB_PATH(emptyBin) });
      assert.equal(unsupported.code, 1);
      assert.match(unsupported.stdout, /no codex .* matches the tested runtime 0\.154\.0-alpha\.6\.2/);
      assert.match(unsupported.stdout, /builda/i);
    } finally {
      fx.server?.close();
      rmSync(fx.root, { recursive: true, force: true });
    }
  });

  it("stops when the CLI itself fails — reaching the query, emitting guidance, mutating nothing", async () => {
    const fx = await makeFixture();
    try {
      const port = await startHealth(fx);
      pairEndpoint(fx, `http://127.0.0.1:${port}/mcp`);
      writeStubState(fx, {});
      const failed = await runPs(fx, "install.ps1", [], { VT_STUB_EXIT: "3" });
      assert.equal(failed.code, 1, failed.stdout + failed.stderr);
      // Proves the run reached the intended failing query — not an earlier gate.
      assert.ok(
        invocations(fx).includes("plugin marketplace list --json"),
        `expected the marketplace query in the log, saw: ${invocations(fx).join(" | ") || "(none)"}`,
      );
      // Actionable guidance names the command and its exit; CLI stderr is
      // carried in the failure detail (stdout+stderr both captured by runPs).
      assert.match(failed.stdout, /plugin marketplace list.*exited 3|exited 3/);
      assert.match(failed.stdout + failed.stderr, /Run the command manually/);
      // Zero mutations — the failure was a query, and the run stopped there.
      assert.equal(invocations(fx).filter((l) => / add /.test(l)).length, 0);
    } finally {
      fx.server?.close();
      rmSync(fx.root, { recursive: true, force: true });
    }
  });

  it("a non-JSON CLI response stops distinctly from a nonzero exit", async () => {
    const fx = await makeFixture();
    try {
      const port = await startHealth(fx);
      pairEndpoint(fx, `http://127.0.0.1:${port}/mcp`);
      writeStubState(fx, {});
      // The query exits 0 but answers garbage — different failure kind.
      writeFileSync(join(fx.stubDir, "marketplace.json"), "this is not json");
      const bad = await runPs(fx, "install.ps1");
      assert.equal(bad.code, 1, bad.stdout + bad.stderr);
      assert.match(bad.stdout, /could not read Codex plugin state|did not return the expected JSON|marketplaces array/);
      assert.equal(invocations(fx).filter((l) => / add /.test(l)).length, 0);
    } finally {
      fx.server?.close();
      rmSync(fx.root, { recursive: true, force: true });
    }
  });

  it("malformed CLI state stops before any mutation — a missing array is not empty state", async () => {
    const fx = await makeFixture();
    try {
      const port = await startHealth(fx);
      pairEndpoint(fx, `http://127.0.0.1:${port}/mcp`);
      // installed is not an array — must stop, never be read as "nothing".
      writeStubState(fx, { installed: { bogus: true } });
      const result = await runPs(fx, "install.ps1");
      assert.equal(result.code, 1, result.stdout + result.stderr);
      assert.match(result.stdout, /expected installed array|could not read Codex plugin state/);
      assert.equal(invocations(fx).filter((l) => / add /.test(l)).length, 0);
      // A visual-team entry missing its version field is also unreadable state.
      writeStubState(fx, {
        marketplaces: [{ name: "visual-team-native", root: fx.pkg }],
        installed: [installedEntry(fx, { version: undefined })],
      });
      const noVersion = await runPs(fx, "install.ps1");
      assert.equal(noVersion.code, 1, noVersion.stdout + noVersion.stderr);
      assert.match(noVersion.stdout, /version string field|could not read Codex plugin state/);
      assert.equal(invocations(fx).filter((l) => / add /.test(l)).length, 0);
    } finally {
      fx.server?.close();
      rmSync(fx.root, { recursive: true, force: true });
    }
  });

  it("a string 'false' enabled field is malformed state, not truthy — rejected before mutation", async () => {
    const fx = await makeFixture();
    try {
      const port = await startHealth(fx);
      pairEndpoint(fx, `http://127.0.0.1:${port}/mcp`);
      // enabled:"false" is a STRING — PowerShell truthiness would read it as
      // enabled. The schema gate must require the actual Boolean before any
      // mutation, in both installer and doctor.
      writeStubState(fx, {
        marketplaces: [{ name: "visual-team-native", root: fx.pkg }],
        installed: [installedEntry(fx, { enabled: "false" })],
      });
      const install = await runPs(fx, "install.ps1");
      assert.equal(install.code, 1, install.stdout + install.stderr);
      assert.match(install.stdout, /Boolean enabled field/);
      assert.equal(invocations(fx).filter((l) => / add /.test(l)).length, 0);
      const doctor = await runPs(fx, "doctor.ps1");
      assert.equal(doctor.code, 1, doctor.stdout + doctor.stderr);
      assert.match(doctor.stdout, /FAIL\] plugin state/);
      assert.match(doctor.stdout, /Boolean enabled field/);
      // Real Booleans still work: a genuinely disabled alternate is a note.
      writeStubState(fx, {
        marketplaces: [{ name: "visual-team-native", root: fx.pkg }],
        installed: [remoteEntry(), installedEntry(fx, { enabled: false })],
      });
      const ok = await runPs(fx, "install.ps1");
      assert.equal(ok.code, 0, ok.stdout + ok.stderr);
    } finally {
      fx.server?.close();
      rmSync(fx.root, { recursive: true, force: true });
    }
  });

  it("a same-path install at a different version is a conflict, never an upgrade", async () => {
    const fx = await makeFixture();
    try {
      const port = await startHealth(fx);
      pairEndpoint(fx, `http://127.0.0.1:${port}/mcp`);
      writeStubState(fx, {
        marketplaces: [{ name: "visual-team-native", root: fx.pkg }],
        installed: [installedEntry(fx, { version: "9.9.9" })],
      });
      const result = await runPs(fx, "install.ps1");
      assert.equal(result.code, 1, result.stdout + result.stderr);
      assert.match(result.stdout, /different version|never upgrades/);
      assert.equal(invocations(fx).filter((l) => / add /.test(l)).length, 0);
    } finally {
      fx.server?.close();
      rmSync(fx.root, { recursive: true, force: true });
    }
  });

  it("a successful add whose readback does not show the expected identity is a failure, not a pass", async () => {
    const fx = await makeFixture();
    try {
      const port = await startHealth(fx);
      pairEndpoint(fx, `http://127.0.0.1:${port}/mcp`);
      // The CLI accepts both adds but the re-query shows a wrong version —
      // exit 0 + JSON is not proof the expected identity was installed.
      writeStubState(fx, {
        postMarketplaces: [{ name: "visual-team-native", root: fx.pkg }],
        postInstalled: [installedEntry(fx, { version: "0.2.0" })],
      });
      const result = await runPs(fx, "install.ps1");
      assert.equal(result.code, 1, result.stdout + result.stderr);
      assert.match(result.stdout, /post-install verification failed/);
    } finally {
      fx.server?.close();
      rmSync(fx.root, { recursive: true, force: true });
    }
  });

  it("doctor reports a defined VISUAL_TEAM_MCP_URL override separately from package health", async () => {
    const fx = await makeFixture();
    try {
      const port = await startHealth(fx);
      pairEndpoint(fx, `http://127.0.0.1:${port}/mcp`);
      writeStubState(fx, {
        marketplaces: [{ name: "visual-team-native", root: fx.pkg }],
        installed: [installedEntry(fx)],
      });
      // Valid but different: the package checks still pass, and the override
      // is identified so healthy output is not mistaken for the hook target.
      const differs = await runPs(fx, "doctor.ps1", [], { VISUAL_TEAM_MCP_URL: "http://127.0.0.1:9/mcp" });
      assert.equal(differs.code, 0, differs.stdout + differs.stderr);
      assert.match(differs.stdout, /WARN\] endpoint override/);
      assert.match(differs.stdout, /hooks deliver there, NOT the packaged endpoint/);
      // Invalid defined override disables delivery — a FAIL, not silent.
      const invalid = await runPs(fx, "doctor.ps1", [], { VISUAL_TEAM_MCP_URL: "not-a-url" });
      assert.equal(invalid.code, 1);
      assert.match(invalid.stdout, /FAIL\] endpoint override/);
      // Whitespace IS defined: the hook accepts it as the destination and
      // delivers nowhere — it must surface as invalid, never as "not set".
      const whitespace = await runPs(fx, "doctor.ps1", [], { VISUAL_TEAM_MCP_URL: "   " });
      assert.equal(whitespace.code, 1);
      assert.match(whitespace.stdout, /FAIL\] endpoint override/);
      assert.doesNotMatch(whitespace.stdout, /is not set -- the hook uses the packaged endpoint/);
      // Matching override is reported plainly.
      const matches = await runPs(fx, "doctor.ps1", [], { VISUAL_TEAM_MCP_URL: `http://127.0.0.1:${port}/mcp` });
      assert.equal(matches.code, 0, matches.stdout + matches.stderr);
      assert.match(matches.stdout, /matches the packaged endpoint/);
      // Doctor never mutates regardless of override state.
      for (const line of invocations(fx)) {
        assert.doesNotMatch(line, /add|remove|disable|enable/);
      }
    } finally {
      fx.server?.close();
      rmSync(fx.root, { recursive: true, force: true });
    }
  });

  it("doctor still completes its read-only checks when codex discovery fails", async () => {
    const fx = await makeFixture();
    try {
      const port = await startHealth(fx);
      pairEndpoint(fx, `http://127.0.0.1:${port}/mcp`);
      writeStubState(fx, {});
      const emptyBin = join(fx.root, "empty-bin");
      mkdirSync(emptyBin);
      const result = await runPs(fx, "doctor.ps1", [], { PATH: STUB_PATH(emptyBin) });
      assert.equal(result.code, 1);
      // The discovery failure is a report line, and later checks still ran.
      assert.match(result.stdout, /FAIL\] codex cli/);
      assert.match(result.stdout, /PASS\] package integrity/);
      assert.match(result.stdout, /PASS\] service health/);
      assert.match(result.stdout, /SKIP\] marketplace\/plugin state/);
      assert.equal(invocations(fx).length, 0, "no CLI call may run without a codex");
    } finally {
      fx.server?.close();
      rmSync(fx.root, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Source identity — the package claims a commit, so the named tree must BE
// that checkout. A copied source folder nested under an ignored dir (dist/)
// inherits the parent's HEAD and a scoped status finds none of its files;
// those bytes are not that commit's packaged inputs.
// ---------------------------------------------------------------------------

const REPO_ROOT = process.cwd();
const PACKAGED_INPUTS = ["plugin", "packaging/alpha"];
const PACKAGED_SCRIPTS = ["build-alpha-package.mjs", "build-native-codex-compat.mjs"];
const GIT_AVAILABLE = spawnSync("git", ["--version"]).status === 0;

async function copyInputs(destRoot: string) {
  for (const rel of PACKAGED_INPUTS) {
    cpSync(join(REPO_ROOT, rel), join(destRoot, rel), { recursive: true });
  }
  mkdirSync(join(destRoot, "scripts"), { recursive: true });
  for (const f of PACKAGED_SCRIPTS) {
    cpSync(join(REPO_ROOT, "scripts", f), join(destRoot, "scripts", f));
  }
}

async function identityOf(root: string) {
  const mod = await import(pathToFileURL(join(root, "scripts", "build-alpha-package.mjs")).href);
  return mod.resolveSourceIdentity() as { revision: string; preview: string | null };
}

describe("alpha package source identity", () => {
  it("a copied source tree nested under an ignored dir cannot inherit the parent checkout's identity", async (t) => {
    if (!GIT_AVAILABLE) { t.skip("git unavailable"); return; }
    const savedOverride = process.env.VISUAL_TEAM_SOURCE_SHA;
    delete process.env.VISUAL_TEAM_SOURCE_SHA;
    try {
      const distDir = join(REPO_ROOT, "dist");
      mkdirSync(distDir, { recursive: true });
      const exportDir = mkdtempSync(join(distDir, "vt-srcid-export-"));
      try {
        await copyInputs(exportDir);
        // Coordinator's sentinel: changed bytes inside the copy are not the
        // parent HEAD's packaged inputs.
        appendFileSync(join(exportDir, "packaging", "alpha", "README.txt"), "\nSENTINEL: not the reviewed source\n");
        const identity = await identityOf(exportDir);
        assert.equal(identity.revision, "unverified-preview",
          "a nested export must never report the parent checkout's sha as its own");
        assert.match(identity.preview ?? "", /^[0-9a-f]{40}$/,
          "the inherited parent HEAD is recorded as previewOf, not claimed");
      } finally {
        rmSync(exportDir, { recursive: true, force: true });
      }
    } finally {
      if (savedOverride === undefined) delete process.env.VISUAL_TEAM_SOURCE_SHA;
      else process.env.VISUAL_TEAM_SOURCE_SHA = savedOverride;
    }
  });

  it("a standalone export outside any repo is explicitly unverified, and a clean git checkout verifies", async (t) => {
    if (!GIT_AVAILABLE) { t.skip("git unavailable"); return; }
    const savedOverride = process.env.VISUAL_TEAM_SOURCE_SHA;
    delete process.env.VISUAL_TEAM_SOURCE_SHA;
    try {
      // No git at all — unverifiable, never mislabeled.
      const plain = mkdtempSync(join(tmpdir(), "vt-srcid-plain-"));
      try {
        await copyInputs(plain);
        const identity = await identityOf(plain);
        assert.equal(identity.revision, "unverified-preview");
        assert.equal(identity.preview, null);
      } finally {
        rmSync(plain, { recursive: true, force: true });
      }

      // A clean standalone checkout IS its own checkout — identity verifies.
      const checkout = mkdtempSync(join(tmpdir(), "vt-srcid-git-"));
      try {
        await copyInputs(checkout);
        const git = (args: string[]) => spawnSync("git", args, { cwd: checkout, encoding: "utf8" });
        assert.equal(git(["init", "-q"]).status, 0);
        assert.equal(git(["add", "-A"]).status, 0);
        assert.equal(git(["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "x"]).status, 0);
        const head = git(["rev-parse", "HEAD"]).stdout.trim();
        const identity = await identityOf(checkout);
        assert.equal(identity.revision, head, "a clean standalone checkout verifies to its own HEAD");
      } finally {
        rmSync(checkout, { recursive: true, force: true });
      }
    } finally {
      if (savedOverride === undefined) delete process.env.VISUAL_TEAM_SOURCE_SHA;
      else process.env.VISUAL_TEAM_SOURCE_SHA = savedOverride;
    }
  });
});
