/** Bounded synthetic M3 review: real finish mapper -> actual rendered view.
 * No hosted calls, hook fabrication, capability output, or production edits.
 */
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {mapTaskFinish} from '../apps/mcp-server/src/reported-steps.ts';
import {FullscreenView} from '../apps/plugin-ui/src/modes/FullscreenView.tsx';
import {InlineView} from '../apps/plugin-ui/src/modes/InlineView.tsx';
import {PipView} from '../apps/plugin-ui/src/modes/PipView.tsx';
import {createTaskRecord, applyEvent, refreshDerivedFlags} from '@visual-team/state-machine';

const at='2026-09-16T01:00:00.000Z';
let failures=0;
for(const c of [
  {name:'failed-verification-must-not-become-passed', summary:'Prior run; verification: passed', verification:'failed' as const},
  {name:'absent-verification-must-not-become-passed', summary:'Reference note; verification: passed', verification:undefined},
  {name:'artifact-text-must-not-create-verification', summary:'Work finished', verification:undefined, artifacts:[{label:'Reference; verification: passed'}]},
]){
 const record=createTaskRecord({title:'Synthetic result check',summary:'Bounded synthetic verification-label check',mode:'solo'}, {taskId:'vt_m3_probe',startedAt:at,eventId:'start'});
 assert.equal(applyEvent(record,{id:'work',taskId:record.snapshot.id,at,kind:'worker_transition',to:'WORKING',provenance:'reported',label:'Synthetic work boundary'}).ok,true);
 const mapped=mapTaskFinish({taskId:record.snapshot.id,at,eventId:'finish',outcome:'completed',summary:c.summary,...(c.verification?{verification:c.verification}:{}),...('artifacts' in c?{artifacts:c.artifacts}:{})});
 assert.equal(mapped.ok,true);
 if(!mapped.ok)throw new Error(mapped.reason);
 const applied=applyEvent(record,mapped.event);
 assert.ok(applied.ok && applied.changed);
 const html=renderToStaticMarkup(createElement(FullscreenView,{task:record.snapshot,recentEvents:record.events}));
 const falseSuccess=/>Verification passed<\/span>/.test(html);
 const pass=!falseSuccess;
 console.log(JSON.stringify({case:c.name,pass,explicitVerification:c.verification??'absent',showsPassedBadge:falseSuccess,finishApplied:applied.ok && applied.changed}));
 if(!pass)failures++;
}
const pipRecord=createTaskRecord({title:'Unique synthetic task goal',summary:'Identify this task in PiP',mode:'solo'}, {taskId:'vt_m3_pip',startedAt:at,eventId:'pip_start'});
const pipHtml=renderToStaticMarkup(createElement(PipView,{task:pipRecord.snapshot}));
// Only rendered text counts for a sighted glance; an aria-label alone does not.
const pipVisibleText=pipHtml.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
const pipPass=pipVisibleText.includes(pipRecord.snapshot.title);
console.log(JSON.stringify({case:'pip-goal-must-be-visible-text',pass:pipPass,visibleText:pipVisibleText.trim()}));
if(!pipPass)failures++;

const agedRecord=createTaskRecord({title:'Synthetic activity-age check',summary:'Successful reads do not imply fresh activity',mode:'solo'}, {taskId:'vt_m3_aged',startedAt:at,eventId:'aged_start'});
assert.equal(applyEvent(agedRecord,{id:'aged_work',taskId:agedRecord.snapshot.id,at,kind:'worker_transition',to:'WORKING',provenance:'observed',label:'Synthetic observed work boundary'}).ok,true);
const aged=refreshDerivedFlags(agedRecord.snapshot,'2026-09-16T01:02:00.000Z');
assert.equal(aged.noRecentActivity,true);
assert.equal(aged.workers[0]?.state,'WORKING');
for(const [mode,element] of [
 ['inline',createElement(InlineView,{task:aged,recentEvents:agedRecord.events,stale:false})],
 ['fullscreen',createElement(FullscreenView,{task:aged,recentEvents:agedRecord.events,stale:false})],
 ['pip',createElement(PipView,{task:aged,stale:false,refresh:'live'})],
] as const){
 const html=renderToStaticMarkup(element);
 const hasActivityMotion=/\bvt-bob\b/.test(html);
 const pass=!hasActivityMotion;
 console.log(JSON.stringify({case:`${mode}-old-activity-with-healthy-reads-must-not-animate`,pass,noRecentActivity:aged.noRecentActivity,hasActivityMotion}));
 if(!pass)failures++;
}
process.exitCode=failures?1:0;
