import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyDisplayModeRequest,
  DisplayModeStore,
} from "../src/bridge/hostBridge.ts";

describe("display-mode bridge state", () => {
  it("reacts to async initialize context and host-initiated globals without task reads", () => {
    const store = new DisplayModeStore();
    const observed: string[] = [];
    const stop = store.subscribe(() => observed.push(store.current()));

    assert.equal(store.current(), "inline");
    assert.equal(store.applyInitializeResult({ hostContext: { displayMode: "fullscreen" } }), true);
    assert.equal(store.applyHostGlobals({ globals: { displayMode: "inline" } }), true);

    stop();
    assert.deepEqual(observed, ["fullscreen", "inline"]);
  });

  it("changes only after an accepted response and ignores rejected or unsupported requests", async () => {
    const store = new DisplayModeStore();

    assert.equal(
      await applyDisplayModeRequest(async () => ({ mode: "fullscreen" }), store),
      true,
    );
    assert.equal(store.current(), "fullscreen");

    assert.equal(
      await applyDisplayModeRequest(async () => Promise.reject(new Error("rejected")), store),
      false,
    );
    assert.equal(await applyDisplayModeRequest(async () => ({}), store), false);
    assert.equal(store.current(), "fullscreen");
  });

  it("accepts pip as a host-provided or accepted mode", async () => {
    const store = new DisplayModeStore();
    assert.equal(store.applyHostGlobals({ globals: { displayMode: "pip" } }), true);
    assert.equal(store.current(), "pip");

    assert.equal(
      await applyDisplayModeRequest(async () => ({ mode: "inline" }), store),
      true,
    );
    assert.equal(store.current(), "inline");
  });
});
