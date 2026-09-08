import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {digest} from '../lib/destiny-runtime/artifact.js';
import {LocalArtifactStore,LocalSessionStore,PinnedArtifactReader} from '../lib/destiny-runtime/local-store.js';
import {createPrivateHandler} from '../lib/destiny-runtime/private-handler.js';
import {executeTurn} from '../lib/destiny-runtime/execute.js';
import {searchArtifact,renderKnowledge} from '../lib/destiny-runtime/retrieve.js';
import {createDefaultState,STATIC_URLS,TRIPSHOCK_CATEGORIES} from '../lib/destiny-agent/business.js';
import {interpreterInstructions} from '../lib/destiny-runtime/semantic.js';
import {makeMockServices} from './test-helpers.mjs';
const artifact=JSON.parse(await fs.readFile(new URL('./fixtures/runtime-artifact.json',import.meta.url),'utf8')),revision=digest(artifact);
const now=new Date('2026-09-08T17:00:00Z');
const a=(intent,extra={})=>({intent,query:'',category:null,entityIds:[],fields:[],requestedCount:null,followup:'none',argsJson:'{}',evidence:'',holiday:false,...extra});
const interpret=actions=>async()=>({proposal:{locale:'en',actions},evidence:{kind:'test_fixture'}});
const session=()=>({id:'integration_session_1234',version:0,revision,business:createDefaultState(),history:[],category:null,offeredEntityIds:[],pageContext:{}});
const run=(text,actions,extra={})=>executeTurn({text,artifact,session:session(),interpreter:interpret(actions),services:makeMockServices(),authority:{channel:'chat',grants:[]},traceId:'integration',turnId:'test',now,...extra});

test('fact qualifiers survive both renderers and airport revocation never resurrects aggregate',()=>{
  const result={candidates:[{name:'Test',facts:[{id:'f',claim:'Usually open at 9.',qualifiers:['Hours may vary.']}]}],factIds:['f'],status:'complete'};
  for(const channel of ['chat','voice'])assert.match(renderKnowledge(result,{channel}).text,/Hours may vary/);
  const basis=artifact.projections.find(p=>p.id==='transport_airports').basis[0].factId;
  const revoked=searchArtifact(artifact,a('stable_fact',{entityIds:['transport_airports']}),{},{now,revokedFactIds:new Set([basis])});
  assert.equal(revoked.status,'unavailable');assert.equal(revoked.factIds.length,0);
});
test('search requires semantic affirmative grounded in a fresh pending server question',async()=>{
  let calls=0,query;
  const services=makeMockServices({async searchUnlistedVenue(q){calls++;query=q;return {status:'success',summary:'The official page lists a contact form.',urls:['https://venue.example/contact'],citationUrls:['https://venue.example/contact']};}});
  const first=await run('Find this business',[a('unlisted_search',{query:'Specific venue'})],{services});assert.equal(calls,0);
  const yes=await run('Yes, please',[a('search_consent',{query:'Do not use this model query',evidence:'Yes, please'})],{services,session:first.session});
  assert.equal(calls,1);assert.equal(query,'Specific venue');assert.equal(yes.session.pendingSearch,null);assert.equal(yes.result.links[0],'https://venue.example/contact');
  const noContext=await run('Yes',[a('search_consent',{evidence:'Yes'})],{services});assert.equal(noContext.result.status,'clarify');assert.equal(calls,1);
  await run('Yes',[a('search_consent',{evidence:'Yes'})],{services,session:first.session,now:new Date(now.getTime()+600001)});assert.equal(calls,1);
  await assert.rejects(run('No',[a('search_consent',{evidence:'Yes'})],{services,session:first.session}),/ungrounded/);
});
test('two-unit links preserve the legal split and are withheld unless both units verify',async()=>{
  const args={date_text:'Nov 8 to 10',date_confidence:'explicit',arrival:'2026-11-08',departure:'2026-11-10',adults:4,children:4,adults_evidence:'four adults',children_evidence:'four kids',party_scope:'current_trip',party_evidence:'four adults and four kids'};
  const text='Nov 8 to 10, four adults and four kids';
  const yes=await run(text,[a('availability',{argsJson:JSON.stringify(args)})]);
  assert.equal(yes.result.links.length,2);assert.match(yes.result.reply,/Both condos are required/);assert.match(yes.result.reply,/Suggested split/);
  const unknown=await run(text,[a('availability',{argsJson:JSON.stringify(args)})],{services:makeMockServices({async checkBothUnits(){return {'707':true,'1006':null};}})});assert.equal(unknown.result.links.length,0);
});
test('verified price-drop wording and infant/zero-child assumption remain in shared result',async()=>{
  const args={date_text:'Nov 8 to 10',date_confidence:'explicit',arrival:'2026-11-08',departure:'2026-11-10',adults:2,adults_evidence:'two adults',party_scope:'current_trip',party_evidence:'two adults'};
  const r=await run('Nov 8 to 10, two adults',[a('availability',{argsJson:JSON.stringify(args)})],{services:makeMockServices({async fetchPriceDrops(){return {status:'success',drops:[{unit:'707',dropPct:12,windowDays:3,fromPrice:200,toPrice:176}]};}})});
  assert.match(r.result.reply,/12%/);assert.match(r.result.reply,/before fees and taxes/);assert.match(r.result.reply,/zero children/);assert.match(r.result.reply,/Infants count/);
});
test('guide registry retains Sunbird/photos; semantic prompt uses executable activity keys',async()=>{
  const r=await run('Winter stays and photos',[a('guide_link',{argsJson:'{"topic":"sunbird"}'}),a('guide_link',{argsJson:'{"topic":"photos"}'})]);
  assert.ok(r.result.links.includes(STATIC_URLS.sunbird));assert.ok(r.result.links.includes(STATIC_URLS.virtualTour));
  for(const key of Object.keys(TRIPSHOCK_CATEGORIES))assert.ok(interpreterInstructions(artifact).includes(key));
});
test('cancelled turn discards its proposed state transition',async()=>{
  const abort=new AbortController(),prior=session();
  await assert.rejects(run('Hello',[a('conversational')],{session:prior,signal:abort.signal,interpreter:async()=>{abort.abort();return interpret([a('conversational')])();}}),/cancelled/);
  assert.equal(prior.version,0);assert.deepEqual(prior.history,[]);
});
test('partial stays and flexible windows require fresh exact-date verification',async()=>{
  const prior=session();prior.business.booking={...prior.business.booking,arrival:'2026-11-08',departure:'2026-11-13',adults:2,children:0};
  const calls=[];
  const services=makeMockServices({async checkBothUnits(arrival,departure){calls.push([arrival,departure]);return arrival==='2026-11-09'?{'707':true,'1006':false}:{'707':false,'1006':false};},async fetchCalendarAlternatives(){return {unit707:{longestWindow:{from:'2026-11-09',to:'2026-11-12'}}};},async findOpenWindows(){return [{arrival:'2026-11-09',departure:'2026-11-12',units:{'707':true,'1006':true}},{arrival:'2026-11-15',departure:'2026-11-18',units:{'707':true,'1006':true}}];}});
  const partial=await run('Check our stay',[a('availability')],{session:prior,services});
  assert.equal(partial.result.links.length,1);assert.match(partial.result.reply,/freshly checked alternative.*2026-11-09/);assert.deepEqual(calls.slice(0,2),[['2026-11-08','2026-11-13'],['2026-11-09','2026-11-12']]);
  const flexible=await run('Other nearby dates',[a('flexible_windows',{argsJson:'{"flexibility_days":7}'})],{session:prior,services});
  assert.equal(flexible.result.links.length,1);assert.match(flexible.result.reply,/2 adults and 0 children/);assert.doesNotMatch(flexible.result.reply,/2026-11-15|undefined/);
});
test('partial live beach sources preserve all alerts and the changeable-conditions caveat',async()=>{
  const services=makeMockServices({async fetchBeachConditions(){return {status:'partial',checkedAt:now.toISOString(),flag:{status:'unavailable'},surf:{status:'unavailable'},alerts:{status:'success',items:[{event:'Rip current warning',headline:'Use caution'},{event:'Storm warning',headline:'Seek shelter'}]}};}});
  const r=await run('Beach conditions',[a('beach_conditions')],{services});assert.equal(r.result.status,'partial');assert.match(r.result.reply,/Storm warning/);assert.match(r.result.reply,/Follow posted flags/);assert.match(r.result.reply,/does not guarantee safe swimming/);assert.match(r.result.reply,/could not be verified/);
});

async function serverFixture(t){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'destiny-private-http-'));
  const store=new LocalArtifactStore(root);await store.put(artifact);
  let calls=0;
  const interpreter=async()=>{calls++;return interpret([a('recommendations',{category:'airports',requestedCount:3})])();};
  const common={reader:new PinnedArtifactReader(store),sessions:new LocalSessionStore(path.join(root,'sessions')),interpreter,services:makeMockServices(),candidateRevision:revision,enabled:true,sessionKey:'http-fixture-session-signing-key-only-1234'};
  const handlers=Object.fromEntries(['chat','voice'].map(channel=>[channel,createPrivateHandler({...common,channel})]));
  const server=http.createServer(async(req,res)=>{
    const buffers=[];for await(const b of req)buffers.push(b);req.body=JSON.parse(Buffer.concat(buffers).toString());
    res.status=n=>{res.statusCode=n;return res;};res.json=obj=>{res.setHeader('content-type','application/json');res.end(JSON.stringify(obj));};
    await handlers[req.url.slice(1)](req,res);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await fs.rm(root,{recursive:true,force:true});});
  const origin=`http://127.0.0.1:${server.address().port}`;
  const post=(channel,body,cookie)=>fetch(`${origin}/${channel}`,{method:'POST',headers:{'Content-Type':'application/json',origin,...(cookie?{cookie}:{})},body:JSON.stringify(body)});
  return {post,calls:()=>calls};
}
test('actual HTTP adapters pin the same revision and domain result, without external calls',async t=>{
  const {post}=await serverFixture(t),results=[];
  for(const channel of ['chat','voice']){const response=await post(channel,{text:'Which airports?',turnId:'airports'});assert.equal(response.status,200);results.push(await response.json());}
  assert.equal(results[0].revision,results[1].revision);assert.deepEqual(results[0].outcomes[0].factIds,results[1].outcomes[0].factIds);assert.deepEqual(results[0].trace.serviceCalls,{});
});
test('lost-response retry replays before version check and cannot execute tools twice',async t=>{
  const f=await serverFixture(t),body={text:'Which airports?',turnId:'retry-turn',version:0};
  const first=await f.post('chat',body),cookie=first.headers.get('set-cookie').split(';')[0],data=await first.json();
  assert.equal(first.status,200);
  const retry=await f.post('chat',body,cookie),again=await retry.json();assert.equal(retry.status,200);assert.equal(again.replayed,true);assert.equal(data.traceId,again.traceId);assert.equal(f.calls(),1);
  const collision=await f.post('chat',{...body,text:'Different question'},cookie);assert.equal(collision.status,409);
  const stale=await f.post('chat',{...body,turnId:'new-turn'},cookie);assert.equal(stale.status,409);assert.equal(f.calls(),1);
});
