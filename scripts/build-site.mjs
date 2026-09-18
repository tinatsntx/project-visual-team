import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "dist/site");
// This is the only removable directory. Refuse aliases and an unexpected root.
if (relative(root, output) !== join("dist", "site") || !output.startsWith(resolve(root) + sep)) {
  throw new Error("Refusing to stage outside the repository's dist/site directory.");
}
if (existsSync(output)) {
  if (lstatSync(output).isSymbolicLink() || lstatSync(dirname(output)).isSymbolicLink()) {
    throw new Error("Refusing a symlink staging directory.");
  }
  rmSync(output, { recursive: true });
}

// Explicit source allowlist: never copy a directory, profiles, logs or packages.
const files = [
  ["site/index.html", "index.html"],
  ["site/styles.css", "styles.css"],
  ["site/self-host.html", "self-host.html"],
  ["site/privacy.html", "privacy.html"],
  ["site/preview/index.html", "preview/index.html"],
  ["site/preview/preview.js", "preview/preview.js"],
  ["site/preview/widget.html", "preview/widget.html"],
  ["plugin/assets/composer-icon.svg", "assets/composer-icon.svg"],
  ["plugin/assets/logo.svg", "assets/logo.svg"],
  ["docs/launch-assets/02-native-approval.png", "assets/native-approval.png"],
  ["docs/launch-assets/visual-team-real-demo.mp4", "assets/visual-team-real-demo.mp4"],
  ["apps/plugin-ui/dist/visual-team.js", "preview/dist/visual-team.js"],
  ["apps/plugin-ui/dist/visual-team.css", "preview/dist/visual-team.css"],
  ["apps/plugin-ui/dist/dev-host.js", "preview/dist/dev-host.js"],
];
const manifest = [];
for (const [source, destination] of files) {
  const sourcePath = resolve(root, source);
  const data = readFileSync(sourcePath);
  const content = data.toString("utf8");
  if (/project-visual-team-mcp\.onrender\.com|asdk_app_[a-z0-9]+|vtc_[a-f0-9]{32,}/i.test(content)) {
    throw new Error(`Non-public configuration or capability found in ${source}.`);
  }
  const destinationPath = join(output, destination);
  mkdirSync(dirname(destinationPath), { recursive: true });
  copyFileSync(sourcePath, destinationPath);
  manifest.push({ path: destination, bytes: data.length, sha256: createHash("sha256").update(data).digest("hex") });
}
writeFileSync(join(output, ".nojekyll"), "");
writeFileSync(join(output, "build-manifest.json"), JSON.stringify({ scope: "Static sample; no live MCP connection", files: manifest }, null, 2) + "\n");

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? listFiles(join(directory, entry.name)) : [relative(output, join(directory, entry.name)).replaceAll("\\", "/")]);
}
const expected = new Set([...files.map(([, destination]) => destination), ".nojekyll", "build-manifest.json"]);
const actual = listFiles(output);
if (actual.length !== expected.size || actual.some(path => !expected.has(path))) throw new Error("Staging allowlist mismatch.");
console.log(`Static site: ${actual.length} allowlisted files, ${manifest.reduce((sum, file) => sum + file.bytes, 0)} bytes. Output: dist/site`);
