import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {digest} from '../lib/destiny-runtime/artifact.js';
import {normalizeCategory,retrieveContext} from '../lib/destiny-runtime/knowledge-context.js';
import {validateProposal} from '../lib/destiny-runtime/semantic.js';
import {executeConversation,adaptChannel} from '../lib/destiny-runtime/conversation-v2.js';
import {createDefaultState} from '../lib/destiny-agent/business.js';
import {makeMockServices} from './test-helpers.mjs';
const artifact=JSON.parse(await fs.readFile(new URL('./fixtures/runtime-artifact.json',import.meta.url),'utf8'));
const now=new Date('2026-09-08T17:00:00Z');
const session=()=>({id:'recovery_session_1234567',version:0,revision:digest(artifact),business:createDefaultState(),history:[],pageContext:{},offeredEntityIds:[]});
const call=(name,args,id)=>({type:'function_call',id:'fc_'+id,call_id:id,name,arguments:JSON.stringify(args)});
function clientFor(name,args,reply){const payloads=[];return {payloads,responses:{async create(payload){payloads.push(payload);return payloads.length===1?{id:'response-plan',status:'completed',output:[call('set_request_plan',{tasks:[{id:'t1',outcome:'Answer the guest request',required_tool:name}]},'plan'),call(name,args,'tool')],output_text:''}:{id:'response-answer',status:'completed',output:[],output_text:reply};}}};}
test('unknown category is a safe null hint and canonical human wording normalizes',()=>{
 assert.equal(normalizeCategory('made up category',artifact),null);
 const c=artifact.entries.flatMap(e=>e.categories).find(c=>c.includes('_'));assert.equal(normalizeCategory(c.replaceAll('_',' '),artifact),c);
 const a={intent:'stable_fact',query:'parking',category:'parking imaginary',entityIds:[],fields:[],requestedCount:null,followup:'none',argsJson:'{}',evidence:'parking',holiday:false};
 assert.equal(validateProposal({locale:'en',actions:[a]},{text:'parking',artifact}).actions[0].category,null);
});
test('query-specific evidence is bounded and expired/revoked facts cannot reappear',()=>{
 const entry=artifact.entries.find(e=>e.facts.length>9);const r=retrieveContext(artifact,{query:'hours',entityIds:[entry.id],mode:'facts'},{},{now});
 assert.ok(r.entries[0].facts.length<=9);const id=r.factIds[0];
 assert.ok(!retrieveContext(artifact,{query:'hours',entityIds:[entry.id],mode:'facts'},{},{now,revokedFactIds:new Set([id])}).factIds.includes(id));
 const basis=artifact.projections.find(p=>p.id==='transport_airports').basis[0].factId;
 assert.equal(retrieveContext(artifact,{query:'airports',entityIds:['transport_airports'],mode:'facts'},{},{now,revokedFactIds:new Set([basis])}).entries.length,0);
});
test('model composes the answer once; both channel adapters preserve the full decision',async()=>{
 const args={query:'Publix Main Street normal hours',entityIds:['essential_publix'],category:null,mode:'facts',count:1,fields:['normal hours']};
 const openai=clientFor('get_business_knowledge',args,'Publix at Main Street normally opens from 7 a.m. to 10 p.m. daily, Central Time. Pharmacy hours are separate.');
 const services=makeMockServices({fetchPublishedKnowledge(){throw new Error('remote knowledge');},fetchBlogContent(){throw new Error('remote blog');}});
 const r=await executeConversation({text:'What are the normal hours at Publix Main Street?',artifact,session:session(),openai,services,traceId:'trace',turnId:'turn',now});
 assert.equal(openai.payloads.length,2);assert.match(r.result.reply,/7 a.m./);assert.doesNotMatch(r.result.reply,/Use approved|do not trigger/);
 const chat=adaptChannel(r.result,'chat'),voice=adaptChannel(r.result,'voice');assert.equal(chat.decisionId,voice.decisionId);assert.deepEqual(chat.outcomes,voice.outcomes);assert.deepEqual(chat.links,voice.links);assert.equal(chat.reply,voice.reply);assert.equal(openai.payloads.length,2);
 assert.ok(r.result.outcomes[0].factIds.length>0);assert.deepEqual(r.result.trace.serviceCalls,{});
});
test('private records cannot be accessed through the model-led tool path',async()=>{
 let reads=0;const openai=clientFor('get_existing_booking',{},'Please use secure owner support for your private reservation.');
 const r=await executeConversation({text:'Look up my reservation.',artifact,session:session(),openai,services:makeMockServices({fetchGuestBooking(){reads++;throw new Error('private read');}}),traceId:'trace',turnId:'turn',now});
 assert.equal(reads,0);assert.equal(r.result.outcomes[0].status,'denied');
 assert.ok(!openai.payloads[0].tools.some(t=>t.name==='get_existing_booking'));
});

test('invalid current-trip scope evidence is rejected for model correction, never silently keeps stale counts',async()=>{
 let checks=0;const prior=session();prior.business.booking={...prior.business.booking,arrival:'2026-11-08',departure:'2026-11-10',adults:2,children:0};
 const openai=clientFor('check_availability',{children:1,children_evidence:'one child',party_scope:'current_trip',party_evidence:'me and my wife'},'I need to correct the quoted evidence before checking.');
 const r=await executeConversation({text:'Actually one child is coming too.',artifact,session:prior,openai,services:makeMockServices({checkBothUnits(){checks++;return {'707':true,'1006':false};}}),traceId:'trace',turnId:'turn',now});
 assert.equal(checks,0);assert.equal(r.result.outcomes[0].status,'invalid_evidence');assert.equal(r.result.links.length,0);
});

test('flexible-window links in the recovered executor require fresh exact-date verification',async()=>{
 const prior=session();prior.business.booking={...prior.business.booking,arrival:'2026-11-08',departure:'2026-11-13',adults:2,children:0};
 const openai=clientFor('find_open_windows',{flexibility_days:7},'Only the freshly verified alternative can be offered.');
 const services=makeMockServices({async checkBothUnits(arrival){return arrival==='2026-11-09'?{'707':true,'1006':false}:{'707':null,'1006':null};},async findOpenWindows(){return [{arrival:'2026-11-09',departure:'2026-11-12',units:{'707':true,'1006':true}},{arrival:'2026-11-15',departure:'2026-11-18',units:{'707':true,'1006':true}}];}});
 const r=await executeConversation({text:'Check nearby alternative dates.',artifact,session:prior,openai,services,traceId:'trace',turnId:'turn',now});
 assert.equal(r.result.links.length,1);assert.match(r.result.links[0],/2026-11-09/);assert.equal(r.result.outcomes[0].data.options.length,1);
});

test('optional search uses only a pending stored query and exact latest-message consent',async()=>{
 const prior=session();prior.pendingSearch={query:'Synthetic test shop',requestedAt:now.toISOString()};let lookedUp=null;
 const openai=clientFor('search_unlisted_business',{evidence:'Yes please'},'The test result has no verified hours.');
 const r=await executeConversation({text:'Yes please',artifact,session:prior,openai,services:makeMockServices({searchUnlistedVenue(q){lookedUp=q;return {status:'success',summary:'No verified hours.'};}}),traceId:'trace',turnId:'turn',now});
 assert.equal(lookedUp,'Synthetic test shop');assert.equal(r.session.pendingSearch,null);
});
test('more excludes all previously offered IDs and category changes reset exclusions',()=>{
 const category='airports';const first=retrieveContext(artifact,{query:'airports',category,mode:'recommendations',count:1},{},{now});
 const second=retrieveContext(artifact,{query:'more airports',category,mode:'more',count:2},{category,offeredEntityIds:first.entries.map(e=>e.id)},{now});
 assert.ok(second.entries.every(e=>!first.entries.some(p=>p.id===e.id)));
});
