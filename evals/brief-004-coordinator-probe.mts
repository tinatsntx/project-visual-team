/**
 * Coordinator diagnostic for candidate 0e9bcc3. Run in a separate process:
 *   node --import tsx evals/brief-004-coordinator-probe.mts
 * Uses synthetic data, stubbed timers/window, and no network. Prints outcomes,
 * not secrets. Exit 0 means the probe ran; it does NOT mean acceptance passed.
 * SWE-2 should turn the expected behavior into focused regression assertions.
 */
import { TaskDataStore } from '../apps/plugin-ui/src/bridge/taskData.ts';
import { HostBridge, toolResultFromGlobals } from '../apps/plugin-ui/src/bridge/hostBridge.ts';
import { TASK_CAPABILITY_META_KEY as KEY } from '../packages/contracts/src/meta.ts';

const stamp = '2026-09-14T00:00:00.000Z';
const task = (id = 'vt_review_a', count = 1) => ({ id, title: 'Synthetic review', summary: '', mode: 'solo', privacyMode: 'standard', state: 'ACTIVE', stateProvenance: 'reported', workers: [], createdAt: stamp, updatedAt: stamp, lastActivityAt: stamp, noRecentActivity: false, needsUser: false, eventCount: count });
const envelope = (value = task()) => ({structuredContent: {task: value, recentEvents: []}, _meta: {[KEY]: 'synthetic-local-only'}});
const timers = {setTimeout: () => 1, clearTimeout: () => {}, setInterval: () => 2, clearInterval: () => {}};
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
const output = [];

// Failed retry must not claim a new successful observation from cached data.
let now = stamp;
const cached = envelope();
const stale = new TaskDataStore({timers, nowIso: () => now, recheck: () => cached, callRead: async () => ({isError: true})});
stale.start(); stale.applyToolResult(cached); await flush();
const before = stale.snapshot().lastUpdatedAt;
now = '2026-09-14T01:00:00.000Z'; stale.retry(); await flush();
output.push({case:'failed-retry-cached-timestamp', before, after:stale.snapshot().lastUpdatedAt, remainsStale:stale.snapshot().refresh === 'stale', incorrectlyAdvanced:before !== stale.snapshot().lastUpdatedAt});
stale.dispose();

// A terminal notification must not be reversed by a read started before it.
let release;
const terminal = new TaskDataStore({timers, callRead: () => new Promise(resolve => { release = resolve; })});
terminal.applyToolResult(envelope());
terminal.applyToolResult(envelope({...task(), state:'COMPLETED', updatedAt:'2026-09-14T00:01:00.000Z'}));
release({isError:true}); await flush();
output.push({case:'late-error-after-terminal', state:terminal.snapshot().task?.state, refresh:terminal.snapshot().refresh});
terminal.dispose();

// New task with partial data must not inherit previous task's event list.
const switched = new TaskDataStore({timers});
switched.applyToolResult({structuredContent:{task:task(), recentEvents:[{id:'evt_local',taskId:'vt_review_a',at:stamp,kind:'activity',label:'Synthetic event',provenance:'observed'}]}});
switched.applyToolResult({structuredContent:{task:task('vt_review_b')}});
output.push({case:'task-switch-partial-events', taskId:switched.snapshot().taskId, eventTaskIds:switched.snapshot().recentEvents.map(e=>e.taskId)});
switched.dispose();

// React can subscribe after two host messages. The bridge must retain both parts.
const listeners = new Map();
const parent = {postMessage: () => {}};
globalThis.window = {parent, addEventListener:(name,handler) => listeners.set(name,handler)};
globalThis.setTimeout = () => 3;
const bridge = new HostBridge(); bridge.start();
listeners.get('message')({source:parent,data:{jsonrpc:'2.0',id:1,result:{hostContext:{displayMode:'inline'}}}});
await flush();
listeners.get('message')({source:parent,data:{jsonrpc:'2.0',method:'ui/notifications/tool-result',params:{_meta:{[KEY]:'synthetic-local-only'}}}});
listeners.get('message')({source:parent,data:{jsonrpc:'2.0',method:'ui/notifications/tool-result',params:{structuredContent:{task:task(),recentEvents:[]}}}});
const mounted = new TaskDataStore({timers});
bridge.onToolResult(r => mounted.applyToolResult(r));
mounted.applyToolResult(bridge.currentToolResult());
output.push({case:'both-split-parts-before-subscription', phase:mounted.snapshot().phase, hasCapability:mounted.snapshot().hasCapability});
mounted.dispose();

const reverseBridge = new HostBridge(); reverseBridge.start();
listeners.get('message')({source:parent,data:{jsonrpc:'2.0',id:1,result:{hostContext:{displayMode:'inline'}}}});
await flush();
listeners.get('message')({source:parent,data:{jsonrpc:'2.0',method:'ui/notifications/tool-result',params:{structuredContent:{task:task(),recentEvents:[]}}}});
listeners.get('openai:set_globals')({detail:{globals:{toolResponseMetadata:{mcp_tool_result:{_meta:{[KEY]:'synthetic-local-only'}}}}}});
const reverseMounted = new TaskDataStore({timers});
reverseBridge.onToolResult(r => reverseMounted.applyToolResult(r));
reverseMounted.applyToolResult(reverseBridge.currentToolResult());
output.push({case:'public-then-private-before-subscription',phase:reverseMounted.snapshot().phase,hasTask:reverseMounted.snapshot().task !== null,hasCapability:reverseMounted.snapshot().hasCapability});
reverseMounted.dispose();

// A new public global paired with the previous envelope is incorrectly ignored.
const merged = toolResultFromGlobals({toolOutput:{task:task('vt_review_b')},toolResponseMetadata:{mcp_tool_result:envelope(task('vt_review_a'))}});
output.push({case:'new-public-old-metadata', expectedTask:'vt_review_b', selectedTask:merged?.structuredContent?.task?.id});
console.log(JSON.stringify(output,null,2));
