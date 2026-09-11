import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {EventEmitter} from 'node:events';
import {createHash} from 'node:crypto';
import {PrivateEnvelopeStore,PrivateEnvelopeReader,validateEnvelope} from '../lib/destiny-brain/envelope-store.js';
import {createBrainServer} from '../lib/destiny-brain/server.js';
import {createBrainReadServices} from '../lib/destiny-brain/read-services.js';
import {createPrivateRealtimeHandler} from '../lib/destiny-brain/realtime.js';
import {domainAdapters} from '../lib/destiny-brain/accepted/adapters.mjs';
import {Actions} from '../lib/destiny-brain/accepted/actions.mjs';
import {hydrate} from '../lib/destiny-brain/accepted/kernel.mjs';
import {isPrivatePeer} from '../lib/destiny-brain/boundary.js';
import approval from '../lib/destiny-brain/ACCEPTED-SOURCE.json' with {type:'json'};

// Explicit nonbillable mocks. No real model, owner, reservation or guest data.
const envelope=JSON.parse(await fs.readFile(new URL('../lib/destiny-brain/accepted/preview-envelope.json',import.meta.url),'utf8'));
const finish=text=>({id:'mock-response',status:'completed',output:[],output_text:text,usage:{input_tokens:100,output_tokens:10}});
const tool=(name,args)=>({id:'mock-tool',status:'completed',output:[{type:'function_call',call_id:'mock-call',name,arguments:JSON.stringify(args)}]});
async function fixture(t,{respond=()=>finish('Hello! How can I help?'),clientEnabled=true,reviewLogger=null}={}){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'private-brain-integration-'));
  const store=new PrivateEnvelopeStore(root);await store.put(envelope);await store.select(envelope.revision);
  const calls=[];const client={responses:{create:async(request,options)=>{calls.push(structuredClone(request));assert.equal(options.maxRetries,0);assert.equal(options.timeout,25000);return respond(request,calls.length);}}};
  const env={DESTINY_PRIVATE_RUNTIME:'1',DESTINY_PRIVATE_STORE:root,DESTINY_PRIVATE_SESSION_KEY:'test-signing-key-only-not-a-real-secret-12345'};
  const app=createBrainServer({env,...(clientEnabled?{client}:{}),serviceFactory:()=>({}),reviewLoggerFactory:()=>reviewLogger});
  const server=http.createServer(async(req,res)=>{
    res.status=code=>{res.statusCode=code;return res;};res.json=data=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));};
    const chunks=[];for await(const b of req)chunks.push(b);req.body=JSON.parse(Buffer.concat(chunks).toString()||'{}');
    await app.servePrivate(req.url.includes('voice')?'voice':'chat',req,res);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));assert.equal(path.dirname(root),os.tmpdir());assert.ok(path.basename(root).startsWith('private-brain-integration-'));await fs.rm(root,{recursive:true,force:true});});
  const origin=`http://127.0.0.1:${server.address().port}`;
  const post=(channel,body,cookie,headers={})=>{
    const options={method:'POST',headers:{origin,'Content-Type':'application/json',...(cookie?{cookie}:{}),...headers}};
    if(headers.host)return new Promise((resolve,reject)=>{const req=http.request(`${origin}/api/destiny-private-${channel}`,options,res=>{res.resume();res.on('end',()=>resolve({status:res.statusCode}));});req.on('error',reject);req.end(JSON.stringify(body));});
    return fetch(`${origin}/api/destiny-private-${channel}`,{...options,body:JSON.stringify(body)});
  };
  return {post,calls,store,root,app};
}

test('accepted runtime files are byte-identical and no fixtures or runners are vendored',async()=>{
  assert.equal(approval.files.length,23);
  for(const file of approval.files){assert.doesNotMatch(file.path,/fixture|harness|evaluation|execute\.mjs|grade/);const bytes=await fs.readFile(new URL('../lib/destiny-brain/accepted/'+file.path,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);}
  assert.equal(validateEnvelope(envelope).publicKnowledge.packages.length,195);
  const corrupt=structuredClone(envelope);corrupt.publicKnowledge.packages[0].name='changed';assert.throws(()=>validateEnvelope(corrupt),/integrity/);
});
test('actual private HTTP dispatch shares one saved decision across Chat and Voice replay',async t=>{
  const f=await fixture(t);const first=await f.post('chat',{text:'Hello',turnId:'same',version:0});
  const cookie=first.headers.get('set-cookie').split(';')[0],chat=await first.json();
  assert.equal(first.status,200);assert.equal(chat.trace.route,'accepted-private-brain');assert.match(cookie,/destiny_private_brain_v1=/);
  const replay=await f.post('voice',{text:'Hello',turnId:'same',version:0},cookie),voice=await replay.json();
  assert.equal(voice.replayed,true);assert.equal(f.calls.length,1);assert.equal(chat.decisionId,voice.decisionId);assert.equal(chat.reply,voice.reply);assert.deepEqual(chat.links,voice.links);assert.deepEqual(chat.domain,voice.domain);
  const strip=({channel,...x})=>x;assert.deepEqual(strip(chat.presentations.chat),strip(chat.presentations.voice));
});
test('successful private turns enqueue one anonymized review record without delaying replay',async t=>{
  const rows=[],f=await fixture(t,{reviewLogger:async row=>{rows.push(row);return {ok:true};}});
  const response=await f.post('chat',{text:'Synthetic restaurant question',turnId:'review-one',version:0}),cookie=response.headers.get('set-cookie').split(';')[0],body=await response.json();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(body.status,'complete');assert.equal(rows.length,1);assert.equal(rows[0].question,'Synthetic restaurant question');assert.equal(rows[0].answer,body.reply);assert.equal(rows[0].channel,'chat');assert.equal(rows[0].anonymousSessionId.length,24);assert.ok(rows[0].responseTimeMs>=0);assert.ok(rows[0].hqRevision);assert.ok(rows[0].decisionId);
  const replay=await f.post('voice',{text:'Synthetic restaurant question',turnId:'review-one',version:0},cookie);assert.equal((await replay.json()).replayed,true);await new Promise(resolve=>setImmediate(resolve));assert.equal(rows.length,1);
});
test('cross-channel follow-up restores interpreted state, knowledge scope and history',async t=>{
  const f=await fixture(t,{respond:(_r,n)=>n===1?tool('get_hq_packages',{entity_ids:['access_building']}):finish('The building has elevators.')});
  const response=await f.post('chat',{text:'Tell me about building access.',turnId:'first'}),cookie=response.headers.get('set-cookie').split(';')[0],first=await response.json();
  const next=await f.post('voice',{text:'Thanks. What did we discuss?',turnId:'next'},cookie);assert.equal(next.status,200);assert.equal((await next.json()).version,2);
  const last=f.calls.at(-1),state=last.input.find(m=>m.role==='developer'&&m.content?.includes('canonicalState'));
  assert.equal(JSON.parse(state.content).canonicalState.concierge.turn,2);
  assert.ok(JSON.parse(state.content).canonicalState.knowledge.entityIds.includes('access_building'));
  assert.ok(last.input.some(m=>m.role==='assistant'&&m.content===first.reply));
  assert.equal(JSON.parse(state.content).approvedHqIndex.length,195);
  assert.equal(last.model,'gpt-5.6-sol');assert.equal(last.text.verbosity,'low');assert.equal(last.reasoning.effort,'low');assert.equal(last.max_output_tokens,2400);
});
test('cookie tampering, caller authority, forwarding and wrong origin fail before model dispatch',async t=>{
  const f=await fixture(t);
  for(const [body,cookie,headers,code] of [
    [{text:'Hello',state:{}},null,{},400],[{text:'Hello',grants:['owner_chat']},null,{},400],
    [{text:'Hello'},'destiny_private_brain_v1=forged',{},401],[{text:'Hello'},null,{origin:'https://evil.invalid'},403],
    [{text:'Hello'},null,{'x-forwarded-for':'127.0.0.1'},404],[{text:'Hello'},null,{host:'private.evil.invalid'},404]]){
    assert.equal((await f.post('chat',body,cookie,headers)).status,code);
  }
  assert.equal(f.calls.length,0);
});
test('turn collisions and stale versions never invoke another model call',async t=>{
  const f=await fixture(t),r=await f.post('chat',{text:'Hello',turnId:'one',version:0}),cookie=r.headers.get('set-cookie').split(';')[0];await r.json();
  assert.equal((await f.post('voice',{text:'Different',turnId:'one'},cookie)).status,409);
  assert.equal((await f.post('chat',{text:'Next',turnId:'two',version:0},cookie)).status,409);assert.equal(f.calls.length,1);
});
test('model failure is persisted honestly and replay does not retry',async t=>{
  const f=await fixture(t,{respond:()=>{throw Error('mock transport failure');}});
  const r=await f.post('chat',{text:'Hello',turnId:'failed'}),cookie=r.headers.get('set-cookie').split(';')[0],data=await r.json();
  assert.equal(data.status,'unavailable');assert.equal(data.failure,'model_transport_failed');assert.equal(data.links.length,0);
  const replay=await f.post('voice',{text:'Hello',turnId:'failed'},cookie);assert.equal((await replay.json()).replayed,true);assert.equal(f.calls.length,1);
});
test('incomplete model output and unapproved links cannot become a successful preview answer',async t=>{
  for(const response of [{...finish('Draft'),status:'incomplete'},finish('Visit https://unapproved.invalid/a')]){
    const f=await fixture(t,{respond:()=>response}),r=await f.post('chat',{text:'Hello',turnId:'guard'}),data=await r.json();
    assert.equal(data.status,'unavailable');assert.ok(data.failure);assert.deepEqual(data.links,[]);assert.doesNotMatch(data.reply,/unapproved/);
  }
});
test('model spending is disabled by default even with private routes selected',async t=>{
  const f=await fixture(t,{clientEnabled:false});assert.equal((await f.post('chat',{text:'Hello'})).status,503);assert.equal(f.calls.length,0);
});
test('private rollback disables dispatch, restore works, and store rejects concurrent selection and drift',async t=>{
  const f=await fixture(t);const reader=new PrivateEnvelopeReader(f.store),first=await reader.pinned(envelope.revision),second=await reader.pinned(envelope.revision);
  assert.equal(first.cacheState,'miss');assert.equal(second.cacheState,'hit');assert.ok(Object.isFrozen(first.artifact));
  await f.store.rollback({expectedGeneration:1});assert.equal((await f.post('chat',{text:'Hello'})).status,404);
  assert.equal((await reader.pinned(envelope.revision)).revision,envelope.revision);
  await assert.rejects(f.store.select(envelope.revision,{expectedGeneration:1}),/pointer_conflict/);
  await f.store.rollback({expectedGeneration:2});assert.equal((await f.post('chat',{text:'Hello'})).status,200);
  const file=f.store.objectPath(envelope.revision);await fs.writeFile(file,'{}');await assert.rejects(new PrivateEnvelopeReader(f.store).pinned(envelope.revision),/schema/);
});
test('every side-effect adapter remains denied even if a server service is accidentally supplied',async()=>{
  let writes=0;const a=domainAdapters(new Proxy({},{get:()=>async()=>{writes++;return {sent:true,captured:true};}}));
  for(const name of ['request_owner_chat','relay_owner_message','create_maintenance_alert','capture_lead'])await assert.rejects(a[name]({outcome:{action_evidence:'Synthetic test',details:{severity:'maintenance',message:'Synthetic',email:'synthetic@example.test'}}}),/action_not_authorized/);
  await assert.rejects(a.get_existing_booking(),/booking_not_authorized/);assert.equal(writes,0);
});
test('read-only adapter exposes no write or guest-record methods and permits only the public availability projection',async()=>{
  let calls=0;const services=createBrainReadServices({env:{},fetchImpl:async(url,options)=>{calls++;assert.equal(url,'https://www.destincondogetaways.com/api/destiny-voice-availability');assert.equal(options.method,'POST');return {ok:true,json:async()=>({units:[{unit:'707',available:true},{unit:'1006',available:false}]})};}});
  assert.deepEqual(Object.keys(services).sort(),['checkBothUnits','fetchBeachConditions','fetchBeachDeals','fetchDestinWeather','findOpenWindows'].sort());
  assert.deepEqual(await services.checkBothUnits('2027-01-01','2027-01-03'),{'707':true,'1006':false});
  await assert.rejects(services.findOpenWindows({}),/unavailable/);assert.equal(calls,1);
});
test('real OwnerRez adapter projects synthetic provider records to booleans only',async()=>{
  const services=createBrainReadServices({env:{OWNERREZ_API_TOKEN:'synthetic-test-token'},fetchImpl:async(_url,options)=>{assert.equal(options.method,undefined);return {ok:true,json:async()=>({items:[{arrival:'2027-02-01',departure:'2027-02-04',status:'active',guestName:'SYNTHETIC_DO_NOT_FORWARD',payment:'SYNTHETIC'}]})};}});
  const result=await services.checkBothUnits('2027-02-02','2027-02-03');assert.deepEqual(result,{'707':false,'1006':false});assert.doesNotMatch(JSON.stringify(result),/SYNTHETIC/);
});
test('checking both condos keeps the full guest party on each alternative link',async()=>{
  const clock={now:'2026-09-11T17:00:00.000Z',timeZone:'America/Chicago',locale:'en-US'};
  const state=hydrate({booking:{arrival:'2026-11-01',departure:'2026-11-14',adults:2,children:0,totalGuests:2}});
  const outcome={id:'both-options',kind:'availability',unit_ids:['707','1006'],booking_operation:'refresh',dates:{status:'resolved',precision:'exact',start:'2026-11-01',end:'2026-11-14',source:'guest_exact'},unit_scope:'two'};
  const engine=new Actions({state,clock,outcomes:[outcome],services:{checkBothUnits:async()=>({'707':true,'1006':true})}});
  const result=await engine.execute('check_availability',{outcome_id:'both-options'});
  assert.equal(result.data.requiresTwoUnits,false);
  assert.equal(result.links.length,2);
  for(const link of result.links){assert.deepEqual(link.party,{adults:2,children:0,total:2});assert.match(link.url,/or_adults=2/);assert.match(link.url,/or_guests=2/);}
});
function responseMock(){const res=new EventEmitter();res.headers={};res.setHeader=(k,v)=>res.headers[k]=v;res.status=n=>{res.statusCode=n;return res;};res.json=res.send=data=>{res.body=data;return res;};return res;}
test('private Realtime uses only a renderer, transcriber and server-only credential',async()=>{
  let calls=0;const env={DESTINY_PRIVATE_RUNTIME:'1',DESTINY_PRIVATE_MODEL_CALLS:'1',OPENAI_API_KEY:'synthetic-test-token'};
  const handler=createPrivateRealtimeHandler({env,fetchImpl:async(url,options)=>{calls++;assert.equal(url,'https://api.openai.com/v1/realtime/calls');const session=JSON.parse(options.body.get('session'));assert.deepEqual(session.tools,[]);assert.equal(session.tool_choice,'none');assert.doesNotMatch(JSON.stringify(session),/synthetic-test-token/);assert.match(session.instructions,/verbatim/);return {ok:true,text:async()=> 'v=0\r\nmock-answer'};}});
  const req={method:'POST',socket:{remoteAddress:'127.0.0.1'},headers:{host:'localhost:3000',origin:'http://localhost:3000','content-type':'application/sdp'},async *[Symbol.asyncIterator](){yield Buffer.from('v=0\r\nmock-offer');}},res=responseMock();
  await handler(req,res);assert.equal(res.statusCode,200);assert.equal(calls,1);
  for(const changed of [{...env,DESTINY_PRIVATE_RUNTIME:'0'},{...env,DESTINY_PRIVATE_MODEL_CALLS:'0'}]){const r=responseMock();await createPrivateRealtimeHandler({env:changed,fetchImpl:()=>{throw Error('must not call');}})(req,r);assert.ok([404,503].includes(r.statusCode));}
  const previewEnv={VERCEL_ENV:'preview',OPENAI_API_KEY:'synthetic-test-token'};
  const previewReq={...req,socket:{remoteAddress:'10.0.0.1'},headers:{host:'destiny-preview.vercel.app',origin:'https://destiny-preview.vercel.app','x-vercel-id':'iad1::synthetic','content-type':'application/sdp'}};
  const previewResponse=responseMock();
  await createPrivateRealtimeHandler({env:previewEnv,fetchImpl:async(_url,options)=>{const session=JSON.parse(options.body.get('session'));assert.deepEqual(session.tools,[]);assert.match(session.instructions,/do not read URLs/i);return {ok:true,text:async()=> 'v=0\r\npreview-answer'};}})(previewReq,previewResponse);
  assert.equal(previewResponse.statusCode,200);
  for(const changedReq of [{...previewReq,headers:{...previewReq.headers,origin:'https://evil.example'}},{...previewReq,headers:{...previewReq.headers,'x-vercel-id':''}}]){const r=responseMock();await createPrivateRealtimeHandler({env:previewEnv,fetchImpl:()=>{throw Error('must not call');}})(changedReq,r);assert.equal(r.statusCode,404);}
  const productionResponse=responseMock();await createPrivateRealtimeHandler({env:{VERCEL_ENV:'production',OPENAI_API_KEY:'synthetic-test-token'},fetchImpl:()=>{throw Error('must not call');}})(previewReq,productionResponse);assert.equal(productionResponse.statusCode,404);
});
test('Next derived forwarding headers are allowed; caller forwarding and altered derived values are denied',()=>{
  const env={DESTINY_PRIVATE_RUNTIME:'1'},req={socket:{remoteAddress:'127.0.0.1'},rawHeaders:['Host','localhost:3000'],headers:{host:'localhost:3000','x-forwarded-for':'127.0.0.1','x-forwarded-host':'localhost:3000','x-forwarded-proto':'http','x-forwarded-port':'3000'}};
  assert.equal(isPrivatePeer(req,env),true);
  assert.equal(isPrivatePeer({...req,rawHeaders:[...req.rawHeaders,'X-Forwarded-For','127.0.0.1']},env),false);
  assert.equal(isPrivatePeer({...req,headers:{...req.headers,'x-forwarded-host':'external.invalid'}},env),false);
});
