#!/usr/bin/env node
/**
 * Post-build integration check: the widget bundle and stylesheet emitted by
 * esbuild must survive MCP resource composition byte-for-byte. Runs inside
 * `npm run build`, after @visual-team/plugin-ui produces dist/visual-team.js.
 */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { UI_RESOURCE_MIME_TYPE, UI_TEMPLATE_URI } from "@visual-team/contracts";
import { bundlePath, uiResourceContents } from "../apps/mcp-server/src/ui-resources/widget.ts";

const jsPath = bundlePath();
assert.ok(existsSync(jsPath), `widget bundle missing: ${jsPath}`);
const js = await readFile(jsPath, "utf8");
const cssPath = jsPath.replace(/\.js$/, ".css");
const css = existsSync(cssPath) ? await readFile(cssPath, "utf8") : "";

const resource = uiResourceContents();
assert.equal(resource.uri, UI_TEMPLATE_URI);
assert.equal(resource.mimeType, UI_RESOURCE_MIME_TYPE);
assert.ok(resource.text.includes(js), "UI resource must inline the built bundle verbatim");
if (css) assert.ok(resource.text.includes(css), "UI resource must inline the built stylesheet verbatim");

const placeholders = (text: string) => text.match(/%%(?:CSS|BUNDLE)%%/g)?.length ?? 0;
assert.equal(
  placeholders(resource.text),
  placeholders(js) + placeholders(css),
  "unfilled template placeholders remain in the composed UI resource",
);

process.stdout.write(`Verified UI resource embeds the built bundle verbatim: ${jsPath}\n`);
