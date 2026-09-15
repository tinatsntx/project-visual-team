import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { UI_RESOURCE_MIME_TYPE, UI_TEMPLATE_URI } from "@visual-team/contracts";

/**
 * Serves the single-file MCP Apps UI resource (PROJECT_PLAN.md §9.6).
 *
 * The React bundle is produced by `apps/plugin-ui` (esbuild, single ESM
 * module) and inlined into a minimal HTML shell. Data and rendering stay
 * decoupled: routine state updates flow through `get_visual_task` over the
 * host bridge, so the iframe is not recreated per event.
 */

const here = dirname(fileURLToPath(import.meta.url));

function defaultBundlePath(): string {
  return resolve(here, "..", "..", "..", "plugin-ui", "dist", "visual-team.js");
}

export function bundlePath(): string {
  return process.env.VISUAL_TEAM_UI_BUNDLE ?? defaultBundlePath();
}

export function bundleAvailable(): boolean {
  return existsSync(bundlePath());
}

const HTML_SHELL = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Visual Team</title>
<style>
%%CSS%%
</style>
</head>
<body>
<div id="root"></div>
<script type="module">
%%BUNDLE%%
</script>
</body>
</html>`;

export function uiResourceContents(): {
  uri: string;
  mimeType: string;
  text: string;
  _meta: Record<string, unknown>;
} {
  const js = readFileSync(bundlePath(), "utf8");
  // esbuild emits the imported stylesheet next to the JS bundle; the iframe
  // cannot fetch external files, so it is inlined here.
  const cssPath = bundlePath().replace(/\.js$/, ".css");
  const css = existsSync(cssPath) ? readFileSync(cssPath, "utf8") : "";
  return {
    uri: UI_TEMPLATE_URI,
    mimeType: UI_RESOURCE_MIME_TYPE,
    // Function replacers insert literally: string replacements would interpret
    // $$, $&, $`, $' and $n sequences inside the bundle and stylesheet.
    text: HTML_SHELL.replace("%%CSS%%", () => css).replace("%%BUNDLE%%", () => js),
    _meta: {
      ui: {
        prefersBorder: true,
        // The UI talks to the host only over the MCP Apps postMessage bridge;
        // it needs no direct network access (plan §13.5: exact CSP).
        csp: { connectDomains: [], resourceDomains: [] },
      },
    },
  };
}
