#!/usr/bin/env node
/**
 * Builds the guided private-alpha package (brief 012): a versioned, prebuilt
 * Windows native compatibility folder under dist/, containing the complete
 * marketplace/plugin artifact plus install.ps1, doctor.ps1, participant
 * instructions, and an integrity manifest tying every packaged file to the
 * reviewed source revision.
 *
 * The package is generated output — dist/ is gitignored. The manifest's
 * sourceRevision is the commit the package was built FROM (the reviewed
 * source), never the hash of a commit containing the package itself.
 * Override with VISUAL_TEAM_SOURCE_SHA for clean-export builds.
 *
 *   node scripts/build-alpha-package.mjs          # folder only
 *   node scripts/build-alpha-package.mjs --zip    # folder + .zip via tar
 *
 * Kept out of the generic `npm run build`: Render builds/tests on Linux and
 * the archive is a Windows-side packaging step.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildNativeCodexCompat,
  outputDirectory as compatOutputDir,
  projectRoot,
} from "./build-native-codex-compat.mjs";

const alphaSourceDir = resolve(projectRoot, "packaging", "alpha");
export const alphaPackageRoot = resolve(projectRoot, "dist", "visual-team-alpha");
export const alphaZipPath = resolve(projectRoot, "dist", "visual-team-alpha.zip");

function sourceRevision() {
  if (process.env.VISUAL_TEAM_SOURCE_SHA) return process.env.VISUAL_TEAM_SOURCE_SHA;
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: projectRoot, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
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

export async function buildAlphaPackage({ outDir = alphaPackageRoot } = {}) {
  // Regenerate the compatibility artifact so the package always carries the
  // current reviewed source — never a stale dist/ leftover.
  await buildNativeCodexCompat();

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await cp(compatOutputDir, outDir, { recursive: true });
  for (const name of ["install.ps1", "doctor.ps1", "vt-alpha-common.ps1", "README.txt"]) {
    const contents = await readFile(join(alphaSourceDir, name));
    // Windows PowerShell 5.1 reads BOM-less .ps1 files as ANSI; emit a UTF-8
    // BOM so the scripts can never be silently misdecoded on a participant
    // machine.
    const bom = name.endsWith(".ps1") ? Buffer.from([0xef, 0xbb, 0xbf]) : Buffer.alloc(0);
    await writeFile(join(outDir, name), Buffer.concat([bom, contents]));
  }

  // Integrity manifest: sha256 of every packaged file except the manifest
  // itself, keyed by forward-slash relative path.
  const files = {};
  for (const path of await filesInDirectory(outDir)) {
    if (path === join(outDir, "integrity.json")) continue;
    const rel = relative(outDir, path).replaceAll("\\", "/");
    files[rel] = createHash("sha256").update(await readFile(path)).digest("hex");
  }
  const sorted = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(
    join(outDir, "integrity.json"),
    `${JSON.stringify(
      {
        package: "visual-team-alpha",
        sourceRevision: sourceRevision(),
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
  return outDir;
}

async function makeZip() {
  try {
    await rm(alphaZipPath, { force: true });
    execFileSync("tar", ["-a", "-c", "-f", alphaZipPath, "-C", dirname(alphaPackageRoot), "visual-team-alpha"], {
      stdio: "inherit",
    });
    return alphaZipPath;
  } catch (error) {
    throw new Error(`archive creation failed (tar -a is required): ${error.message}`, { cause: error });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const wantZip = process.argv.includes("--zip");
  buildAlphaPackage()
    .then(async (dir) => {
      process.stdout.write(`Generated alpha package: ${dir}\n`);
      if (wantZip) process.stdout.write(`Archived: ${await makeZip()}\n`);
    })
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.stack : error}\n`);
      process.exitCode = 1;
    });
}
