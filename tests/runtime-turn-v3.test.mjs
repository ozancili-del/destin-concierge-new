import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {digest} from '../lib/destiny-runtime/artifact.js';
import {createDefaultState} from '../lib/destiny-agent/business.js';
import {makeMockServices} from './test-helpers.mjs';
import {speculativeEvidence,guestSentences,fieldEvidence} from '../lib/destiny-runtime/guest-evidence.js';
import {bookingTransaction} from '../lib/destiny-runtime/booking-transaction.js';
import {executeDomainAction} from '../lib/destiny-runtime/domain-actions.js';
import {executeConversation,adaptChannel} from '../lib/destiny-runtime/conversation.js';
import {groundAnswer,groundedSentence} from '../lib/destiny-runtime/answer-grounding.js';
import {createPrivateHandler} from '../lib/destiny-runtime/private-handler.js';
import {LocalArtifactStore,PinnedArtifactReader,LocalSessionStore} from '../lib/destiny-runtime/local-store.js';
const artifact=JSON.parse(await fs.readFile(new URL('./fixtures/runtime-v3-artifact.json',import.meta.url),'utf8')),now=new Date('2026-09-08T17:00:00Z');
const session=()=>({id:'v3_synthetic_session_1234567',version:0,revision:digest(artifact),business:createDefaultState(),history:[],pageContext:{},offeredEntityIds:[],pendingSearch:null});
const empty={sentences:[],linkIds:[],unknown:false,clarification:null};
const answer=e=>({sentences:[{evidenceId:e.id,chat:e.text,voice:e.text}],linkIds:[],unknown:false,clarification:null});
const delta={type:'booking',dateMode:'unchanged',arrival:null,departure:null,holiday:null,partyScope:'current_trip',adults:null,children:null,totalGuests:null,unit:null};
function client(fn){const calls=[];return {calls,responses:{async create(p){calls.push(p);return {id:'test_response_'+calls.length,status:'completed',usage:{input_tokens:100,output_tokens:30},output_text:JSON.stringify(await fn(JSON.parse(p.input),calls.length,p))};}}};}
const run=(openai,overrides={})=>executeConversation({text:'What are the normal hours at Publix at Main Street?',history:[],session:session(),artifact,openai,services:makeMockServices(),traceId:'trace',turnId:'turn',now,...overrides});

test('guest projection excludes control instructions before the answer model',()=>{
 assert.deepEqual(guestSentences('Answer ordinary descriptions from approved HQ. Destiny may identify this pharmacy. Public contact and official location route. Normal hours are 7 AM to 10 PM.'),['Normal hours are 7 AM to 10 PM.']);
 const r=speculativeEvidence(artifact,'What are the normal hours at Publix at Main Street?',[],{},{now});
 assert.ok(r.evidence.some(e=>/7 a.m/.test(e.text)));assert.ok(r.evidence.length<15);assert.ok(r.trace.bytes<9500);
 assert.doesNotMatch(r.evidence.map(e=>e.text).join(' '),/approved HQ|Destiny may|owner.review|Public contact and official/);
 const id=r.evidence[0].factId;assert.ok(!speculativeEvidence(artifact,'Publix at Main Street',[],{},{now,revokedFactIds:new Set([id])}).evidence.some(e=>e.factId===id));
});
test('stable HQ question is one compact call without planning tool/catalog/enums',async()=>{
 const openai=client(input=>({topic:'knowledge',actions:[],answer:answer(input.evidence.find(e=>/7 a.m/.test(e.text)))}));
 const r=await run(openai);assert.equal(openai.calls.length,1);assert.ok(r.result.trace.withinOrdinaryBudget);assert.match(r.result.reply,/7 a.m/);
 assert.doesNotMatch(JSON.stringify(openai.calls[0]),/set_request_plan|CATALOG|essential_walmart/);assert.equal(openai.calls[0].tools,undefined);assert.ok(JSON.stringify(openai.calls[0]).length<23000);
 assert.equal(r.result.trace.tokens.input,100);assert.equal(r.result.trace.serviceCalls.fetchPublishedKnowledge,undefined);
});

test('a home-base location does not suppress the requested grocery subject',()=>{
 const r=speculativeEvidence(artifact,'Give me two convenient grocery options near Pelican Beach Resort.',[],{},{now});
 assert.ok(r.trace.entityIds.filter(id=>id.startsWith('essential_')).length>=2);
 assert.ok(r.trace.entityIds.some(id=>['essential_publix','essential_target','essential_aldi_destin'].includes(id)));
 assert.ok(r.trace.entityIds.length>1);
});
test('atomic booking applies a child correction, recalculates total and returns a fresh matching link',async()=>{
 const state=createDefaultState();Object.assign(state.booking,{arrival:'2026-11-08',departure:'2026-11-10',adults:2,children:0,totalGuests:2});
 const services=makeMockServices(),r=await bookingTransaction(state,{...delta,children:1},{services,now});
 assert.equal(r.state.booking.adults,2);assert.equal(r.state.booking.children,1);assert.equal(r.state.booking.totalGuests,3);assert.equal(services.calls.checkBothUnits.length,1);
 assert.ok(r.links.every(l=>l.url.includes('or_children=1')&&l.url.includes('or_guests=3')));assert.equal(state.booking.children,0);
});
test('booking rejects unknown children and ambiguous date changes without checking inventory',async()=>{
 const s=createDefaultState();Object.assign(s.booking,{arrival:'2026-11-08',departure:'2026-11-10',adults:2,children:null});const services=makeMockServices();
 const unknown=await bookingTransaction(s,delta,{services,now});assert.equal(unknown.status,'clarification');assert.equal(services.calls.checkBothUnits.length,0);
 const ambiguous=await bookingTransaction(s,{...delta,dateMode:'ambiguous'},{services,now});assert.equal(ambiguous.state.booking.arrival,'2026-11-08');assert.match(ambiguous.evidence[0].text,/arrival.*departure/);
});
test('unknown availability removes stale links even on a resend',async()=>{
 const s=createDefaultState();Object.assign(s.booking,{arrival:'2026-11-08',departure:'2026-11-10',adults:2,children:0});s.verified.bookingUrls=['stale'];
 const r=await bookingTransaction(s,delta,{services:makeMockServices({checkBothUnits:async()=>({'707':null,'1006':false})}),now});assert.deepEqual(r.links,[]);assert.deepEqual(r.state.verified.bookingUrls,[]);assert.equal(r.fields['707'].status,'unavailable');
});
test('ordinary action requires two calls and completes the corrected booking in the same turn',async()=>{
 const prior=session();Object.assign(prior.business.booking,{arrival:'2026-11-08',departure:'2026-11-10',adults:2,children:0,totalGuests:2});
 const openai=client((input,n)=>n===1?{topic:'booking',actions:[{...delta,children:1}],answer:empty}:answer(input.evidence.find(e=>e.id==='booking.trip')));
 const r=await run(openai,{text:'Actually we have one child coming too.',session:prior});assert.equal(openai.calls.length,2);assert.equal(r.result.trace.actionCompletion,true);assert.equal(r.session.business.booking.totalGuests,3);assert.ok(r.result.links[0].includes('or_children=1'));assert.doesNotMatch(r.result.reply,/evidence|permission/i);
});
test('independent live reads execute concurrently, with one composition',async()=>{
 let active=0,max=0;const work=async value=>{active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,15));active--;return value;};
 const services=makeMockServices({fetchDestinWeather:()=>work({status:'success',forecast:[]}),fetchBeachConditions:()=>work({status:'success'})});
 const openai=client((input,n)=>n===1?{topic:'live',actions:[{type:'weather'},{type:'beach'}],answer:empty}:empty);
 const r=await run(openai,{text:'Weather and beach conditions?',services});assert.equal(max,2);assert.equal(openai.calls.length,2);assert.equal(r.result.trace.actions.length,2);
});
test('empty coastal alerts never establish beach-closure status',async()=>{
 const r=await executeDomainAction({type:'beach'},{state:createDefaultState(),session:session(),services:makeMockServices(),authority:{grants:[]},now,text:'Beach?',history:[]});
 assert.deepEqual(r.fields.beachClosure,{status:'not_checked',value:null});assert.deepEqual(r.fields.alerts.value,[]);assert.equal(r.fields.alerts.status,'verified');
 const e=r.evidence.find(e=>e.id==='beach.alerts');assert.equal(groundedSentence('No beach closures are active.',e).ok,false);
});
test('unsupported names and numbers cannot survive grounding; source-scoped safety is canonical',()=>{
 const e=fieldEvidence('g','store','verified',null,'ALDI is roughly a 3-minute drive.',{kind:'hq',entityId:'aldi'});e.entity='ALDI';
 assert.equal(groundedSentence('Walmart is a 3-minute drive.',e).ok,false);assert.equal(groundedSentence('ALDI is a 2-minute drive.',e).ok,false);
 const r=groundAnswer({sentences:[{evidenceId:'g',chat:'Walmart is a 3-minute drive.',voice:'Walmart is a 3-minute drive.'}],linkIds:[]},[e],[]);assert.equal(r.sentences[0].chat,e.text);assert.equal(r.violations.length,1);
});
test('Chat and Voice share claims/actions but use distinct link presentation',async()=>{
 const openai=client((input,n)=>n===1?{topic:'knowledge',actions:[{type:'guide',topic:'sunbird'}],answer:empty}:answer(input.evidence.find(e=>e.id==='guide.sunbird')));
 const r=await run(openai,{text:'Winter stays?'}),chat=adaptChannel(r.result,'chat'),voice=adaptChannel(r.result,'voice');
 assert.equal(chat.decisionId,voice.decisionId);assert.deepEqual(chat.answer.claimIds,voice.answer.claimIds);assert.deepEqual(chat.outcomes,voice.outcomes);assert.match(chat.reply,/https:/);assert.doesNotMatch(voice.reply,/https:/);assert.equal(voice.presentation.physicalTested,false);
});
test('actual HTTP adapters share one v3 decision and do not run a cross-channel replay twice',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'destiny-v3-http-')),store=new LocalArtifactStore(root);await store.put(artifact);
 const openai=client(input=>({topic:'conversation',actions:[],answer:answer(input.evidence.find(e=>e.id==='identity'))}));
 const common={reader:new PinnedArtifactReader(store),sessions:new LocalSessionStore(path.join(root,'sessions')),services:makeMockServices(),scopedOpenAI:openai,executor:executeConversation,candidateRevision:digest(artifact),enabled:true,sessionKey:'synthetic-v3-http-signing-value-1234567890'};
 const handlers=Object.fromEntries(['chat','voice'].map(channel=>[channel,createPrivateHandler({...common,channel})]));
 const server=http.createServer(async(req,res)=>{const chunks=[];for await(const c of req)chunks.push(c);req.body=JSON.parse(Buffer.concat(chunks));res.status=n=>{res.statusCode=n;return res;};res.json=o=>res.end(JSON.stringify(o));await handlers[req.url.slice(1)](req,res);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep));assert.ok(path.basename(root).startsWith('destiny-v3-http-'));await fs.rm(root,{recursive:true,force:true});});
 const origin=`http://127.0.0.1:${server.address().port}`,post=(channel,cookie)=>fetch(origin+'/'+channel,{method:'POST',headers:{origin,'content-type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify({text:'Who are you?',turnId:'same',version:0})});
 const c=await post('chat'),cookie=c.headers.get('set-cookie').split(';')[0],chat=await c.json(),v=await post('voice',cookie),voice=await v.json();assert.equal(c.status,200);assert.equal(v.status,200);assert.equal(voice.replayed,true);assert.equal(chat.decisionId,voice.decisionId);assert.equal(openai.calls.length,1);
});

test('Destin date, not UTC date, is supplied to the model after local evening',async()=>{
 const openai=client(input=>{assert.equal(input.context.today,'2026-09-08');return {topic:'conversation',actions:[],answer:answer(input.evidence[0])};});
 await run(openai,{now:new Date('2026-09-09T02:00:00Z')});assert.equal(openai.calls.length,1);
});
test('requested unit and guest-friendly counts are the required booking presentation',async()=>{
 const s=createDefaultState();Object.assign(s.booking,{arrival:'2026-11-08',departure:'2026-11-10',adults:2,children:1,preferredUnit:'707'});
 const r=await bookingTransaction(s,delta,{services:makeMockServices(),now});assert.ok(!r.requiredEvidenceIds.includes('booking.unit.1006'));assert.equal(r.links.find(l=>l.unit==='1006').required,false);assert.match(r.evidence[0].text,/November.*1 child/);assert.doesNotMatch(r.evidence[0].text,/1 children|2026-11/);
});
test('activity category is canonical and retains its specific affiliate destination',async()=>{
 const r=await executeDomainAction({type:'activity',category:'dolphin',arrival:'2026-11-08',departure:'2026-11-10'},{state:createDefaultState(),session:session(),services:makeMockServices(),authority:{grants:[]},now,text:'Dolphin cruises',history:[]});assert.match(r.links[0].url,/dolphin-cruises/);assert.match(r.evidence[0].text,/dolphin cruises/);
 const bad=await executeDomainAction({type:'activity',category:'made up'},{state:createDefaultState(),session:session(),services:makeMockServices(),authority:{grants:[]},now,text:'An activity',history:[]});assert.equal(bad.status,'clarification');assert.equal(bad.links.length,0);
});
test('model-backed optional search is counted and cannot add a third polishing call',async()=>{
 const prior=session();prior.pendingSearch={query:'Synthetic shop',requestedAt:now.toISOString()};
 const openai=client(()=>({topic:'knowledge',actions:[{type:'optional_search',decision:'accept',query:null}],answer:empty}));
 const services=makeMockServices({searchUnlistedVenue:async()=>({status:'success',summary:'Hours were not verified.',urls:['https://example.com'],modelTrace:{model:'gpt-5-mini',responseId:'search_response',status:'completed',usage:{input_tokens:30,output_tokens:10},elapsedMs:5}})});
 const r=await run(openai,{text:'Yes, please.',session:prior,services});assert.equal(openai.calls.length,1);assert.equal(r.result.trace.modelCalls,2);assert.equal(r.result.trace.tokens.input,130);assert.equal(r.result.trace.withinOrdinaryBudget,true);assert.equal(r.session.pendingSearch,null);
});
