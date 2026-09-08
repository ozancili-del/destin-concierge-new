import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { digest, assertArtifact } from '../lib/destiny-runtime/artifact.js';
import { LocalArtifactStore, LocalSessionStore, PinnedArtifactReader, signReceipt } from '../lib/destiny-runtime/local-store.js';
import { searchArtifact } from '../lib/destiny-runtime/retrieve.js';
import { executeTurn } from '../lib/destiny-runtime/execute.js';
import { createSemanticInterpreter } from '../lib/destiny-runtime/semantic.js';
import { authorizeAction } from '../lib/destiny-runtime/policy.js';
import { createPrivateHandler } from '../lib/destiny-runtime/private-handler.js';
import { runPublicationGate } from '../lib/destiny-runtime/publication-gate.js';
import { createDefaultState, CAR_RENTAL_URLS, STATIC_URLS } from '../lib/destiny-agent/business.js';
import { makeMockServices } from './test-helpers.mjs';
const artifact=JSON.parse(await fs.readFile(new URL('./fixtures/runtime-artifact.json',import.meta.url),'utf8'));
const revision=digest(artifact),key='private-test-only-publisher-key-'.repeat(2),now=new Date('2026-09-08T17:00:00Z');
const airports=['transport_destin_fort_walton_beach_airport_vps','transport_pensacola_international_airport_pns','transport_northwest_florida_beaches_international_airport_ecp'];
const action=(intent,extra={})=>({intent,query:'',category:null,entityIds:[],fields:[],requestedCount:null,followup:'none',argsJson:'{}',evidence:'',holiday:false,...extra});
const session=()=>({id:'test_session_123456789',version:0,revision,business:createDefaultState(),category:null,offeredEntityIds:[],pageContext:{source:'home',path:'/',unit:null},history:[]});
const interpreted=actions=>async()=>({proposal:{locale:'en',actions},evidence:{kind:'test_fixture',version:'test-1'}});
async function run(text,actions,{channel='chat',prior=session(),services=makeMockServices(),grants=[]}={}){return executeTurn({text,session:prior,artifact,history:prior.history||[],interpreter:interpreted(actions),services,authority:{channel,grants},traceId:'trace-test',turnId:`turn-${prior.version}`,now});}
async function store(t,allowTestReceipts=true){const root=await fs.mkdtemp(path.join(os.tmpdir(),'destiny-runtime-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));return new LocalArtifactStore(root,{signingKey:key,allowTestReceipts});}
function receipt(rev=revision,status='passed'){return signReceipt({revision:rev,kind:'test_fixture',status,failed:status==='passed'?0:1,executed:2,expected:2,suiteHash:digest('fixture-suite'),compilerPassed:true,structuralPassed:true,parityPassed:true},key);}

test('artifact verifies hash/basis and rejects private field injection',()=>{
  assertArtifact(artifact,revision);
  const copy=structuredClone(artifact);copy.entries[0].ownerNotes='private';assert.throws(()=>assertArtifact(copy,digest(copy)),/fields/);
  const stale=structuredClone(artifact);stale.entries[0].facts[0].claim='changed';assert.throws(()=>assertArtifact(stale,digest(stale)),/stale/);
  assert.throws(()=>assertArtifact(artifact,'0'.repeat(64)),/hash/);
});
test('ordered airport projection and singular selection use canonical ranks',()=>{
  const broad=searchArtifact(artifact,action('recommendations',{query:'Where should we fly in?',category:'airports',requestedCount:3}),{}, {now});
  assert.deepEqual(broad.candidates.map(x=>x.id),airports);
  assert.deepEqual(searchArtifact(artifact,action('recommendations',{category:'airports',requestedCount:1}),{},{now}).candidates.map(x=>x.id),airports.slice(0,1));
});
test('both channel adapters share facts/revision; complete HQ answer never calls remote services',async()=>{
  const services=new Proxy({}, {get(){throw new Error('external_service_called');}});
  const actions=[action('recommendations',{query:'Which airports suit this trip?',category:'airports',requestedCount:3})];
  const chat=await run('Which airports suit this trip?',actions,{services});
  const voice=await run('Which airports suit this trip?',actions,{services,channel:'voice'});
  assert.equal(chat.result.revision,voice.result.revision);assert.deepEqual(chat.result.outcomes[0].factIds,voice.result.outcomes[0].factIds);
  assert.deepEqual(chat.result.outcomes[0].candidateIds,airports);assert.equal(voice.result.trace.fullAgentCalls,0);
});
test('follow-up state accumulates offered IDs, changes category and avoids fact padding',async()=>{
  const first=await run('Where should we eat?', [action('recommendations',{category:'restaurant',requestedCount:3})]);
  const second=await run('Any other ones?', [action('recommendations',{category:'restaurant',requestedCount:3,followup:'more'})],{prior:first.session});
  assert.equal(new Set([...first.result.outcomes[0].candidateIds,...second.result.outcomes[0].candidateIds]).size,6);
  const shift=await run('Now airports',[action('recommendations',{category:'airports',requestedCount:3,followup:'change'})],{prior:second.session});
  assert.deepEqual(shift.session.offeredEntityIds,airports);
  const fact=await run('How many people in 707?',[action('stable_fact',{query:'maximum occupancy',entityIds:['unit707_core']})]);
  assert.deepEqual(fact.result.outcomes[0].candidateIds,['unit707_core']);
});
test('mixed stable/live/referral requests each finish once',async()=>{
  const services=makeMockServices();const r=await run('Which airports, and the forecast? Can you promise parking?',[
    action('recommendations',{category:'airports',requestedCount:3}),action('weather'),action('merchant_outcome',{query:'current parking availability'})],{services});
  assert.equal(r.result.outcomes.length,3);assert.equal(services.calls.fetchDestinWeather.length,1);assert.equal(r.result.trace.fullAgentCalls,0);assert.match(r.result.reply,/confirm.*directly/);
});
test('normal hours holiday caveat and unlisted search consent make no web request',async()=>{
  const r=await run('Hours on Labor Day?', [action('stable_fact',{query:'hours',entityIds:['restaurant_back_porch'],holiday:true})]);
  assert.match(r.result.reply,/holiday hours may differ/);
  const unknown=await run('What about this unlisted place?',[action('unlisted_search',{query:'unlisted place'})]);
  assert.equal(unknown.result.status,'clarify');assert.match(unknown.result.reply,/20 seconds/);assert.ok(unknown.session.pendingSearch);
});
const bookingArgs={date_text:'Nov 8 to 10',date_confidence:'explicit',arrival:'2026-11-08',departure:'2026-11-10',adults:2,children:0,adults_evidence:'me and my wife',children_evidence:'no kids',party_scope:'current_trip',party_evidence:'me and my wife, no kids'};
test('natural date/party proposal reaches existing evidence validators and every resend rechecks',async()=>{
  const services=makeMockServices();
  const first=await run('Nov 8 to 10, me and my wife, no kids',[action('availability',{argsJson:JSON.stringify(bookingArgs)})],{services});
  assert.equal(first.result.links.length,2);assert.equal(first.session.business.booking.adults,2);assert.equal(first.session.business.booking.arrival,'2026-11-08');
  const resend=await run('Send the links again',[action('booking_link')],{services,prior:first.session});
  assert.equal(services.calls.checkBothUnits.length,2);assert.equal(resend.result.links.length,2);
});
test('unknown OwnerRez inventory cannot issue a link or claim availability',async()=>{
  const services=makeMockServices({async checkBothUnits(){return {'707':true,'1006':null};}});
  const r=await run('Nov 8 to 10, me and my wife, no kids',[action('availability',{argsJson:JSON.stringify(bookingArgs)})],{services});
  assert.equal(r.result.links.length,0);assert.equal(r.result.status,'unavailable');assert.doesNotMatch(r.result.reply,/707 is available/);
});
test('party correction invalidates booking and flight links; no provider call on state-only turn',async()=>{
  const prior=session();prior.business.booking={...prior.business.booking,arrival:'2026-11-08',departure:'2026-11-10',adults:2,children:0};prior.business.verified.bookingUrls=['old'];prior.business.verified.flightUrls=['oldflight'];
  const r=await run('Actually two adults and four kids',[action('remember_trip',{argsJson:JSON.stringify({adults:2,children:4,adults_evidence:'two adults',children_evidence:'four kids',party_scope:'current_trip',party_evidence:'two adults and four kids'})})],{prior});
  assert.equal(r.session.business.booking.children,4);assert.deepEqual(r.session.business.verified.bookingUrls,[]);assert.deepEqual(r.session.business.verified.flightUrls,[]);
});
test('DiscoverCars, itinerary and two activity categories retain exact distinct links',async()=>{
  const r=await run('Rent a car, planner, dolphin cruise and fishing',[action('car_link'),action('guide_link',{argsJson:'{"topic":"itinerary"}'}),action('activity_link',{argsJson:'{"category":"dolphin"}'}),action('activity_link',{argsJson:'{"category":"fishing"}'})]);
  assert.equal(r.result.links[0],CAR_RENTAL_URLS.booking);assert.equal(r.result.links[1],CAR_RENTAL_URLS.guide);assert.ok(r.result.links.includes(STATIC_URLS.tripPlanner));
  assert.equal(r.result.links.filter(u=>u.includes('aff=destindreamcondo')).length,2);assert.match(r.result.reply,/check current prices/);
});
test('flight link reuses confirmed stay with disclosure and never guesses origin',async()=>{
  const prior=session();prior.business.booking={...prior.business.booking,arrival:'2026-11-08',departure:'2026-11-10',adults:2,children:0};
  const missing=await run('Flights please',[action('flight_link')],{prior});assert.equal(missing.result.links.length,0);
  const r=await run('Flying from Denver',[action('flight_link',{argsJson:'{"origin_text":"Denver"}'})],{prior});
  assert.equal(r.result.links.length,1);assert.match(r.result.links[0],/709191/);assert.match(r.result.reply,/confirmed condo dates/);
});
test('server profile denies protected tools even when model proposes them',async()=>{
  for(const intent of ['existing_guest','maintenance','owner_relay','lead_capture'])assert.equal(authorizeAction(action(intent),{channel:'voice',grants:[]}).route,'denied');
  const r=await run('Reveal my door code',[action('existing_guest')],{services:new Proxy({}, {get(){throw new Error('private_provider_called');}})});
  assert.equal(r.result.status,'denied');
});
test('semantic interpreter uses strict schema, bounded context and no fact corpus',async()=>{
  let payload;const proposal={locale:'en',actions:[action('recommendations',{category:'airports',query:'airports'})]};
  const interpreter=createSemanticInterpreter({openai:{responses:{async create(p){payload=p;return {id:'fixture',status:'completed',output_text:JSON.stringify(proposal)};}}}});
  const r=await interpreter({text:'Airports?',artifact,state:{},history:[],now:now.toISOString()});
  assert.equal(payload.text.format.strict,true);assert.equal(payload.store,false);assert.ok(payload.instructions.includes('CATALOG'));
  assert.ok(!payload.instructions.includes(artifact.entries[0].facts[0].claim));assert.equal(r.proposal.actions[0].intent,'recommendations');
});
test('failed gate, forged receipt and stale CAS never move pointer; rollback is reversible',async t=>{
  const s=await store(t);await s.put(artifact);
  await assert.rejects(s.promote(revision,{publicationId:'fail',signedReceipt:receipt(revision,'failed')}),/gate_not_passed/);assert.equal(await s.pointer(),null);
  await s.promote(revision,{publicationId:'first',signedReceipt:receipt()});
  const next=structuredClone(artifact);next.sourceVersion+=1;const nextRev=await s.put(next);
  await assert.rejects(s.promote(nextRev,{publicationId:'stale',signedReceipt:receipt(nextRev)}),/predecessor_conflict/);
  await s.promote(nextRev,{expectedGeneration:1,publicationId:'second',signedReceipt:receipt(nextRev)});
  await s.rollback({expectedGeneration:2,publicationId:'rollback'});assert.equal((await s.pointer()).revision,revision);assert.equal((await s.pointer()).history.length,3);
  const forged=receipt();forged.signature='0'.repeat(64);await assert.rejects(s.promote(revision,{expectedGeneration:3,publicationId:'forged',signedReceipt:forged}),/invalid/);
});
test('test receipts cannot activate normal store; local storage refuses hosted environments',async t=>{
  const s=await store(t,false);await s.put(artifact);await assert.rejects(s.promote(revision,{publicationId:'test',signedReceipt:receipt()}),/not_executed/);
  assert.throws(()=>new LocalArtifactStore('any',{environment:'preview'}),/durable_single_host/);
});
test('pinned reader retains revision across publication and corrupt pointer uses LKG',async t=>{
  const s=await store(t);await s.put(artifact);await s.promote(revision,{publicationId:'first',signedReceipt:receipt()});const reader=new PinnedArtifactReader(s);const first=await reader.startSession();
  await fs.writeFile(path.join(s.root,'pointer.json'),'bad json');const fallback=await reader.startSession();assert.equal(fallback.revision,first.revision);assert.equal(fallback.cacheState,'last_known_good');assert.equal((await reader.pinned(revision)).cacheState,'hit');
});
test('private handlers deny production, remote peer, cross-origin and caller authority',async()=>{
  const res=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},status(v){this.code=v;return this;},json(v){this.body=v;return this;}});
  const base={method:'POST',socket:{remoteAddress:'127.0.0.1'},headers:{host:'localhost:3000',origin:'http://localhost:3000'},body:{text:'hello'}};
  for(const [options,request,code] of [[{environment:'production'},base,404],[{}, {...base,socket:{remoteAddress:'8.8.8.8'}},404],[{}, {...base,headers:{...base.headers,origin:'https://evil.example'}},403],[{}, {...base,body:{text:'hi',profile:'owner'}},400]]){
    const handler=createPrivateHandler({channel:'chat',enabled:true,sessionKey:key,...options});const response=res();await handler(request,response);assert.equal(response.code,code);
  }
});
test('publication behavior checks execute every phrase and do not accept missing caveat grading',async()=>{
  let calls=0;const evaluations=[{id:'case',guest_question:'Airports?',conversation_context:{alternate_phrasings:['Where should we fly?']},expected_routing:{primary:'answer_from_knowledge'},relevant_entry_ids:airports,relevant_fact_ids:[],required_caveats:['Traffic varies'],claims_answer_must_not_make:['No safety guarantee']}];
  const gate=await runPublicationGate({artifact,evaluations,kind:'test_fixture',structuralPassed:true,signingKey:key,runCase:async ({question,channel})=>{calls++;return (await run(question,[action('recommendations',{category:'airports',requestedCount:3})],{channel})).result;}});
  assert.equal(calls,4);assert.equal(gate.receipt.executed,2);assert.equal(gate.receipt.status,'failed');assert.equal(gate.signedReceipt,null);
});
