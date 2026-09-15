import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { UI_RESOURCE_MIME_TYPE, UI_TEMPLATE_URI } from "@visual-team/contracts";
import { bundleAvailable, bundlePath, uiResourceContents } from "../src/ui-resources/widget.ts";

// Replacement-string metacharacters ($$, $&, $`, $', $n) must reach the served
// resource byte-for-byte: String.replace only treats them literally when the
// replacement comes from a function.
const FIXTURE_JS = [
  "const dollar = '$$';",
  "const matched = '$&';",
  'const before = "$`";',
  'const after = "$\'";',
  "const group = '$1' + '$99' + '$_' + '$+';",
  "const embedded = '%%BUNDLE%%' + '%%CSS%%';",
  "globalThis.__vtFixture = dollar + matched + before + after + group + embedded;",
  "",
].join("\n");
const FIXTURE_CSS = 'a[data-token="$$"]::after{content:"$&"}\n';

describe("MCP UI resource composition", () => {
  it("inlines the bundle and stylesheet literally without interpreting $ sequences", () => {
    const dir = mkdtempSync(join(tmpdir(), "visual-team-resource-"));
    const jsPath = join(dir, "visual-team.js");
    writeFileSync(jsPath, FIXTURE_JS);
    writeFileSync(join(dir, "visual-team.css"), FIXTURE_CSS);

    const previous = process.env.VISUAL_TEAM_UI_BUNDLE;
    process.env.VISUAL_TEAM_UI_BUNDLE = jsPath;
    try {
      assert.equal(bundlePath(), jsPath);
      assert.equal(bundleAvailable(), true);
      const resource = uiResourceContents();
      assert.equal(resource.uri, UI_TEMPLATE_URI);
      assert.equal(resource.mimeType, UI_RESOURCE_MIME_TYPE);
      assert.ok(resource.text.includes(FIXTURE_JS), "bundle must be inlined verbatim");
      assert.ok(resource.text.includes(FIXTURE_CSS), "stylesheet must be inlined verbatim");
      // The only placeholders left are the literals inside the fixture itself.
      assert.equal(resource.text.split("%%BUNDLE%%").length - 1, 1);
      assert.equal(resource.text.split("%%CSS%%").length - 1, 1);
      assert.match(resource.text, /^<!doctype html>/);
      const ui = resource._meta["ui"] as
        | { prefersBorder?: boolean; csp?: { connectDomains?: string[]; resourceDomains?: string[] } }
        | undefined;
      assert.deepEqual(ui?.csp, { connectDomains: [], resourceDomains: [] });
    } finally {
      if (previous === undefined) delete process.env.VISUAL_TEAM_UI_BUNDLE;
      else process.env.VISUAL_TEAM_UI_BUNDLE = previous;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("composes with an empty style block when the stylesheet is absent", () => {
    const dir = mkdtempSync(join(tmpdir(), "visual-team-resource-cssless-"));
    const jsPath = join(dir, "visual-team.js");
    writeFileSync(jsPath, FIXTURE_JS);

    const previous = process.env.VISUAL_TEAM_UI_BUNDLE;
    process.env.VISUAL_TEAM_UI_BUNDLE = jsPath;
    try {
      assert.equal(bundleAvailable(), true);
      const resource = uiResourceContents();
      assert.ok(resource.text.includes(FIXTURE_JS));
      assert.match(resource.text, /<style>\s*<\/style>/);
      assert.equal(resource.text.split("%%CSS%%").length - 1, 1);
    } finally {
      if (previous === undefined) delete process.env.VISUAL_TEAM_UI_BUNDLE;
      else process.env.VISUAL_TEAM_UI_BUNDLE = previous;
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
