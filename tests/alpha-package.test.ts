import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
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
      assert.match(manifest.sourceRevision, /^[0-9a-f]{40}$|^unknown$/);
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
echo codex-cli %VT_STUB_VERSION%
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
exit /b %VT_STUB_ADD_EXIT%
:plist
type "%VT_STUB_DIR%\\plugins.json"
exit /b %VT_STUB_EXIT%
:padd
type "%VT_STUB_DIR%\\added.json"
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

function writeStubState(fx: Fixture, opts: { marketplaces?: unknown[]; installed?: unknown[]; available?: unknown[] }) {
  writeFileSync(join(fx.stubDir, "marketplace.json"), JSON.stringify({ marketplaces: opts.marketplaces ?? [] }));
  writeFileSync(
    join(fx.stubDir, "plugins.json"),
    JSON.stringify({ installed: opts.installed ?? [], available: opts.available ?? [] }),
  );
  writeFileSync(join(fx.stubDir, "added.json"), JSON.stringify({ added: true }));
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
    VT_STUB_DIR: fx.stubDir,
    VT_STUB_LOG: fx.log,
    VT_STUB_VERSION: "0.154.0-alpha.6.2",
    VT_STUB_EXIT: "0",
    VT_STUB_ADD_EXIT: "0",
    ...overrides,
  };
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
  return readFileSync(fx.log, "utf8").split(/\r?\n/).filter(Boolean);
}

const describeWindows = IS_WINDOWS && POWERSHELL ? describe : describe.skip;

describeWindows("alpha installer/doctor against a stubbed codex", () => {
  it("fresh install registers the marketplace and plugin, then repeats as a no-op", async () => {
    const fx = await makeFixture();
    try {
      const port = await startHealth(fx);
      pairEndpoint(fx, `http://127.0.0.1:${port}/mcp`);
      writeStubState(fx, {});

      const first = await runPs(fx, "install.ps1");
      assert.equal(first.code, 0, first.stdout + first.stderr);
      assert.match(first.stdout, /added local marketplace/);
      assert.match(first.stdout, /installed visual-team@visual-team-native/);
      assert.match(first.stdout, /\/hooks/);

      // Now the CLI reports the install — rerun must change nothing.
      writeStubState(fx, {
        marketplaces: [{ name: "visual-team-native", root: fx.pkg }],
        installed: [
          {
            name: "visual-team",
            version: "0.1.0",
            enabled: true,
            source: { path: join(fx.pkg, "visual-team") },
            marketplaceSource: { sourceType: "local", source: fx.pkg },
            marketplace: "visual-team-native",
          },
        ],
      });
      const addsAfterFirst = invocations(fx).filter((l) => / add /.test(l)).length;
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

  it("stops on an enabled foreign-source visual-team and never mutates it", async () => {
    const fx = await makeFixture();
    try {
      const port = await startHealth(fx);
      pairEndpoint(fx, `http://127.0.0.1:${port}/mcp`);
      writeStubState(fx, {
        marketplaces: [{ name: "visual-team-native", root: fx.pkg }],
        installed: [
          {
            name: "visual-team",
            version: "9.9.9",
            enabled: true,
            source: { path: "C:\\other\\visual-team" },
            marketplaceSource: { sourceType: "local", source: "C:\\other" },
            marketplace: null,
          },
        ],
      });
      const result = await runPs(fx, "install.ps1");
      assert.equal(result.code, 1);
      assert.match(result.stdout, /different source/);
      assert.match(result.stdout, /never disables or replaces/);
      assert.equal(invocations(fx).filter((l) => / add /.test(l)).length, 0);
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
          {
            name: "visual-team",
            version: "0.1.0",
            enabled: true,
            source: { path: join(fx.pkg, "visual-team") },
            marketplaceSource: { sourceType: "local", source: fx.pkg },
            marketplace: "visual-team-native",
          },
          {
            name: "visual-team",
            version: "9.9.9",
            enabled: false,
            source: { path: "C:\\other\\visual-team" },
            marketplaceSource: { sourceType: "local", source: "C:\\other" },
            marketplace: null,
          },
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
        installed: [
          {
            name: "visual-team",
            version: "0.1.0",
            enabled: true,
            source: { path: join(fx.pkg, "visual-team") },
            marketplaceSource: { sourceType: "local", source: fx.pkg },
            marketplace: "visual-team-native",
          },
        ],
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
      writeStubState(fx, {});

      // Absent: PATH without any codex.
      const emptyBin = join(fx.root, "empty-bin");
      mkdirSync(emptyBin);
      const absent = await runPs(fx, "install.ps1", [], { PATH: STUB_PATH(emptyBin) });
      assert.equal(absent.code, 1);
      assert.match(absent.stdout, /not found on PATH/);
      assert.match(absent.stdout, /0\.154\.0-alpha\.6\.2/);

      // Ambiguous: a second bin dir holding its own codex.cmd.
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

  it("stops when the CLI itself fails or returns non-JSON", async () => {
    const fx = await makeFixture();
    try {
      const port = await startHealth(fx);
      pairEndpoint(fx, `http://127.0.0.1:${port}/mcp`);
      writeStubState(fx, {});
      const failed = await runPs(fx, "install.ps1", [], { VT_STUB_EXIT: "3" });
      assert.equal(failed.code, 1, failed.stdout + failed.stderr);
      assert.match(failed.stdout, /exited 3|expected JSON/);
      assert.equal(invocations(fx).filter((l) => / add /.test(l)).length, 0);
    } finally {
      fx.server?.close();
      rmSync(fx.root, { recursive: true, force: true });
    }
  });
});
