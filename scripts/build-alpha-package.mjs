#!/usr/bin/env node
/**
 * Builds the guided private-alpha package (brief 012): a versioned, prebuilt
 * Windows native compatibility folder under dist/, containing the complete
 * marketplace/plugin artifact plus install.ps1, doctor.ps1, participant
 * instructions, and an integrity manifest tying every packaged file to the
 * reviewed source revision.
 *
 * The package is generated output — dist/ is gitignored. The manifest's
 * sourceRevision is the commit the packaged inputs were verified to match —
 * never HEAD-by-assumption: the inputs (plugin/, packaging/alpha/, and the
 * two build scripts) must be unmodified relative to the named commit, with
 * no untracked files inside them. A dirty input set produces an explicitly
 * separated `unverified-preview` package directory instead of mislabeling
 * bytes as a reviewed commit. Override the commit with
 * VISUAL_TEAM_SOURCE_SHA for clean-export builds (it must resolve to a real
 * commit, and the same input check applies to that revision).
 *
 * Output identity is versioned: dist/visual-team-alpha-<pluginVersion>-<sha12>
 * (or ...-preview), so building a new revision can never silently replace
 * the folder an earlier alpha install is using as its marketplace source.
 * Source identity is resolved BEFORE any output is removed or replaced.
 *
 *   node scripts/build-alpha-package.mjs          # folder only
 *   node scripts/build-alpha-package.mjs --zip    # folder + .zip via tar
 *
 * Kept out of the generic `npm run build`: Render builds/tests on Linux and
 * the archive is a Windows-side packaging step.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildNativeCodexCompat,
  outputDirectory as compatOutputDir,
  projectRoot,
} from "./build-native-codex-compat.mjs";

const alphaSourceDir = resolve(projectRoot, "packaging", "alpha");

/**
 * Every path whose content lands in the package, relative to projectRoot.
 * The manifest claims the package matches the named commit, so these are the
 * paths that must be clean — coordinator evidence and other unrelated
 * uncommitted work never gate a build.
 */
const packagedInputs = [
  "plugin",
  "packaging/alpha",
  "scripts/build-native-codex-compat.mjs",
  "scripts/build-alpha-package.mjs",
];

function git(args, { allowFailure = false } = {}) {
  const run = spawnSync("git", args, { cwd: projectRoot, encoding: "utf8" });
  if (run.status !== 0) {
    if (allowFailure) return null;
    throw new Error(`git ${args[0]} failed: ${(run.stderr || "").trim()}`);
  }
  return run.stdout.trim();
}

function readPluginVersion() {
  const manifest = JSON.parse(readFileSync(resolve(projectRoot, "plugin", "plugin.json"), "utf8"));
  if (!manifest.version) throw new Error("plugin/plugin.json has no version field");
  return manifest.version;
}

/**
 * Resolves what the package's bytes actually are, before any output is
 * touched. Returns { revision, short, preview }: `revision` is the full
 * verified commit sha, or "unverified-preview" when the packaged inputs do
 * not match a commit (dirty tree or no git); `preview` carries the commit
 * the dirty tree was based on, for diagnosis.
 */
/**
 * Compare two directory paths by canonical form: git's --show-toplevel
 * returns the real path (long names, on-disk case) while projectRoot may
 * carry 8.3 short names (e.g. a Windows runner's TEMP) or symlinks.
 * fs.realpathSync is a JS symlink walk that PRESERVES 8.3 aliases;
 * realpathSync.native calls the OS binding, which expands them. The
 * identity check stays strict — only the path normalization differs.
 */
function canonicalPath(p) {
  try {
    return realpathSync.native(p).toLowerCase();
  } catch {
    return resolve(p).toLowerCase();
  }
}

export function resolveSourceIdentity() {
  const override = process.env.VISUAL_TEAM_SOURCE_SHA;
  let revision;
  if (override) {
    if (!/^[0-9a-f]{6,40}$/i.test(override)) {
      throw new Error(`VISUAL_TEAM_SOURCE_SHA must be a commit sha, got: ${override}`);
    }
    revision = git(["rev-parse", "--verify", `${override}^{commit}`]);
    if (!revision) throw new Error(`VISUAL_TEAM_SOURCE_SHA ${override} does not resolve to a commit`);
  } else {
    revision = git(["rev-parse", "HEAD"], { allowFailure: true });
    if (!revision) return { revision: "unverified-preview", short: "preview", preview: null, reason: "no-git" };
  }

  // The named tree must BE the checkout being verified. An export nested
  // under an ignored dir of an ancestor repo (e.g. dist/) inherits that
  // repo's HEAD while the scoped status sees none of its files — those bytes
  // are not the commit's packaged inputs. A standalone export outside any
  // repo has no toplevel at all. Both are explicitly unverified.
  const toplevel = git(["rev-parse", "--show-toplevel"], { allowFailure: true });
  if (!toplevel || canonicalPath(toplevel) !== canonicalPath(projectRoot)) {
    return { revision: "unverified-preview", short: "preview", preview: revision, reason: "not-the-checkout" };
  }

  // Tracked drift vs the named revision, plus any untracked OR IGNORED files
  // sitting inside packaged input dirs (the package copies whole dirs, so an
  // ignored file inside plugin/ ships in the zip but is invisible to git).
  // `diff --quiet` exits 1 on differences (the helper returns null for
  // nonzero exits); status --porcelain --ignored catches both untracked and
  // ignored files inside the scoped paths.
  const clean = git(["diff", "--quiet", revision, "--", ...packagedInputs], { allowFailure: true });
  const untrackedOrDirty = git(["status", "--porcelain", "--ignored", "--", ...packagedInputs]);
  if (clean === null || untrackedOrDirty !== "") {
    return { revision: "unverified-preview", short: "preview", preview: revision, reason: "inputs-differ" };
  }
  return { revision, short: revision.slice(0, 12), preview: null };
}

/** Default output dir is versioned by plugin version + verified source. */
export function defaultAlphaPackageRoot(identity) {
  const version = readPluginVersion();
  const suffix = identity.revision === "unverified-preview" ? "preview" : identity.short;
  return resolve(projectRoot, "dist", `visual-team-alpha-${version}-${suffix}`);
}

async function filesInDirectory(root) {
  const paths = [];
  async function walk(dir) {
    for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) paths.push(path);
    }
  }
  await walk(root);
  return paths;
}

export async function buildAlphaPackage({ outDir } = {}) {
  // Resolve the packaged source identity FIRST — before any existing output
  // is removed — so a manifest can never claim bytes came from a commit they
  // do not match.
  const identity = resolveSourceIdentity();
  const target = outDir ?? defaultAlphaPackageRoot(identity);

  // Regenerate the compatibility artifact so the package always carries the
  // current reviewed source — never a stale dist/ leftover.
  await buildNativeCodexCompat();

  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  await cp(compatOutputDir, target, { recursive: true });
  for (const name of ["install.ps1", "doctor.ps1", "vt-alpha-common.ps1", "README.txt"]) {
    const contents = await readFile(join(alphaSourceDir, name));
    // Windows PowerShell 5.1 reads BOM-less .ps1 files as ANSI; emit a UTF-8
    // BOM so the scripts can never be silently misdecoded on a participant
    // machine.
    const bom = name.endsWith(".ps1") ? Buffer.from([0xef, 0xbb, 0xbf]) : Buffer.alloc(0);
    await writeFile(join(target, name), Buffer.concat([bom, contents]));
  }

  // Integrity manifest: sha256 of every packaged file except the manifest
  // itself, keyed by forward-slash relative path.
  const files = {};
  for (const path of await filesInDirectory(target)) {
    if (path === join(target, "integrity.json")) continue;
    const rel = relative(target, path).replaceAll("\\", "/");
    files[rel] = createHash("sha256").update(await readFile(path)).digest("hex");
  }
  const sorted = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(
    join(target, "integrity.json"),
    `${JSON.stringify(
      {
        package: "visual-team-alpha",
        pluginVersion: readPluginVersion(),
        sourceRevision: identity.revision,
        ...(identity.preview ? { previewOf: identity.preview } : {}),
        ...(identity.reason ? { sourceIdentityReason: identity.reason } : {}),
        generatedAt: new Date().toISOString(),
        algorithm: "sha256",
        testedRuntime: "codex-cli 0.154.0-alpha.6.2",
        files: sorted,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return target;
}

async function makeZip(packageRoot) {
  const zipPath = `${packageRoot}.zip`;
  try {
    await rm(zipPath, { force: true });
    // Relative paths only: BSD tar parses a drive-letter `-f C:\...` as a
    // remote host and fails.
    const name = relative(dirname(packageRoot), packageRoot);
    execFileSync("tar", ["-a", "-c", "-f", `${name}.zip`, name], {
      cwd: dirname(packageRoot),
      stdio: "inherit",
    });
    return zipPath;
  } catch (error) {
    throw new Error(`archive creation failed (tar -a is required): ${error.message}`, { cause: error });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const wantZip = process.argv.includes("--zip");
  buildAlphaPackage()
    .then(async (dir) => {
      process.stdout.write(`Generated alpha package: ${dir}\n`);
      if (wantZip) process.stdout.write(`Archived: ${await makeZip(dir)}\n`);
    })
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.stack : error}\n`);
      process.exitCode = 1;
    });
}
