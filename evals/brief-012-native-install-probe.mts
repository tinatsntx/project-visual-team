// Coordinator acceptance against the actual supported Windows Codex CLI.
// Usage: node --import tsx evals/brief-012-native-install-probe.mts <package> <codex.exe> [earlier isolated profile]
// Only the fresh child CODEX_HOME receives installation changes. Its files are
// retained under dist/ for review. This does not trust or execute any hook.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

assert.equal(process.platform, "win32", "This acceptance probe requires Windows");
const [packageArg, codexArg, previousProfileArg] = process.argv.slice(2);
assert.ok(packageArg && codexArg, "Pass the extracted package and accepted codex.exe paths");
const packageRoot = resolve(packageArg);
const codex = resolve(codexArg);
assert.ok(existsSync(codex), "The selected Codex executable must exist");
const manifest = JSON.parse(readFileSync(join(packageRoot, "integrity.json"), "utf8"));
assert.match(manifest.sourceRevision, /^[0-9a-f]{40}$/, "Do not install an unverified preview");
assert.equal(manifest.testedRuntime, "codex-cli 0.154.0-alpha.6.2");
for (const [name, expected] of Object.entries<string>(manifest.files)) {
  const file = resolve(packageRoot, name);
  assert.ok(file.startsWith(`${packageRoot}\\`), `Manifest path must remain inside package: ${name}`);
  const actual = createHash("sha256").update(readFileSync(file)).digest("hex");
  assert.equal(actual, expected, `Package hash differs: ${name}`);
}

const dist = resolve("dist");
mkdirSync(dist, { recursive: true });
const profile = mkdtempSync(join(dist, "native alpha profile "));
const childEnv = { ...process.env };
for (const key of Object.keys(childEnv)) {
  if (["codex_home", "visual_team_mcp_url", "psmodulepath"].includes(key.toLowerCase())) {
    delete childEnv[key];
  }
}
childEnv.CODEX_HOME = profile;
childEnv.PSModulePath = join(process.env.SystemRoot ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "Modules");
const powershell = join(process.env.SystemRoot ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");

function run(executable: string, args: string[], env: NodeJS.ProcessEnv, expectedStatus = 0) {
  const result = spawnSync(executable, args, {
    env, cwd: packageRoot, encoding: "utf8", windowsHide: true, timeout: 60_000,
    maxBuffer: 32 * 1024 * 1024,
  });
  // The available catalog is large. Keep it in memory and never dump it as
  // failure output; only participant-script diagnostics are useful here.
  const output = `${args.includes("--json") ? "" : result.stdout ?? ""}\n${result.stderr ?? ""}`.replace(/vtc_[0-9a-f]+/g, "[private capability redacted]");
  assert.equal(result.status, expectedStatus, `${args[0]} returned an unexpected status: ${result.error?.message ?? ""}\n${output.slice(-6000)}`);
  return result.stdout;
}

function state(env: NodeJS.ProcessEnv) {
  const marketplaces = JSON.parse(run(codex, ["plugin", "marketplace", "list", "--json"], env));
  const plugins = JSON.parse(run(codex, ["plugin", "list", "--available", "--json"], env));
  assert.ok(Array.isArray(marketplaces.marketplaces), "Expected native marketplace array");
  assert.ok(Array.isArray(plugins.installed), "Expected native installed array");
  return {
    marketplaces: marketplaces.marketplaces.filter((entry: { name: string }) => entry.name === "visual-team-native"),
    plugins: plugins.installed.filter((entry: { name: string }) => entry.name === "visual-team"),
  };
}

function normalized(value: string) {
  return resolve(value.replace(/^\\\\\?\\/, "")).replace(/\\+$/, "").toLowerCase();
}

const nativeVersion = run(codex, ["--version"], childEnv).trim();
assert.equal(nativeVersion, "codex-cli 0.154.0-alpha.6.2");
const ownerBefore = state(process.env);
const initial = state(childEnv);
assert.equal(initial.marketplaces.length, 0, "Fresh child profile unexpectedly contains the marketplace");
assert.equal(initial.plugins.length, 0, "Fresh child profile unexpectedly contains Visual Team");
console.log(JSON.stringify({ case: "fresh-native-profile-isolated", pass: true, nativeVersion }));

function participantScript(name: string, env = childEnv, expectedStatus = 0) {
  return run(powershell, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", join(packageRoot, name), "-CodexPath", codex], env, expectedStatus);
}

try {
  participantScript("install.ps1");
  const installed = state(childEnv);
  assert.equal(installed.marketplaces.length, 1);
  assert.equal(installed.plugins.length, 1);
  const plugin = installed.plugins[0];
  assert.equal(normalized(installed.marketplaces[0].root), normalized(packageRoot));
  assert.equal(plugin.enabled, true);
  assert.equal(plugin.version, manifest.pluginVersion);
  assert.equal(normalized(plugin.source.path), normalized(join(packageRoot, "visual-team")));
  assert.equal(plugin.marketplaceSource.sourceType, "local");
  assert.equal(normalized(plugin.marketplaceSource.source), normalized(packageRoot));
  console.log(JSON.stringify({ case: "actual-native-install-identity", pass: true, sourceRevision: manifest.sourceRevision }));

  const second = participantScript("install.ps1");
  assert.match(second, /no change/i, "Second installation must explicitly report no change");
  assert.deepEqual(state(childEnv), installed, "Second installation changed native installation state");
  console.log(JSON.stringify({ case: "actual-native-repeat-is-no-op", pass: true }));

  const doctor = participantScript("doctor.ps1");
  assert.match(doctor, /not proof of hook delivery/i);
  assert.deepEqual(state(childEnv), installed, "Doctor changed native installation state");
  console.log(JSON.stringify({ case: "actual-native-doctor-read-only", pass: true, deliveryProven: false }));

  if (previousProfileArg) {
    // Only a prior profile made by this coordinator probe is eligible. Never
    // exercise a conflict-install attempt against the owner's normal home.
    const previousProfile = resolve(previousProfileArg);
    assert.ok(previousProfile.startsWith(join(dist, "native alpha profile ")));
    assert.ok(existsSync(previousProfile), "The prior isolated profile must exist");
    const previousEnv = { ...childEnv, CODEX_HOME: previousProfile };
    const beforeConflict = state(previousEnv);
    assert.equal(beforeConflict.marketplaces.length, 1);
    assert.notEqual(normalized(beforeConflict.marketplaces[0].root), normalized(packageRoot));
    const conflict = participantScript("install.ps1", previousEnv, 1);
    assert.match(conflict, /different package source\/revision/);
    assert.deepEqual(state(previousEnv), beforeConflict, "Conflicting package changed the earlier isolated installation");
    console.log(JSON.stringify({ case: "actual-native-conflicting-package-no-mutation", pass: true }));
  }
} finally {
  assert.deepEqual(state(process.env), ownerBefore, "Owner Visual Team installation state changed during isolated acceptance");
  console.log(JSON.stringify({ case: "owner-visual-team-installation-unchanged", pass: true, retainedProfile: profile, hookReviewPerformed: false }));
}
