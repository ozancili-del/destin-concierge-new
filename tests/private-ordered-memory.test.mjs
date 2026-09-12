import test from 'node:test';

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {OrderedMemory,assertMemorySafe} from '../lib/destiny-brain/ordered-memory.js';
import {FileMemoryStore,RedisMemoryStore,MEMORY_TTL_MS} from '../lib/destiny-brain/memory-store.js';
import {OrderedConversationClient,TranscriptOrderBuffer} from '../lib/destiny-brain/ordered-client.js';
import {OrderedContextRuntime} from '../lib/destiny-brain/ordered-context.js';
import {createOrderedHandler,orderedMemoryEnabled} from '../lib/destiny-brain/ordered-server.js';
import {executePrivateBrain} from '../lib/destiny-brain/executor.js';
import {projectState} from '../lib/destiny-brain/accepted/kernel.mjs';
const envelope=JSON.parse(await fs.readFile(new URL('../lib/destiny-brain/accepted/preview-envelope.json',import.meta.url),'utf8'));
const clock={now:'2026-09-12T12:00:00Z',timeZone:'America/Chicago',locale:'en-US'},id='a'.repeat(64);
async function removeFixture(root){const resolved=path.resolve(root);if(path.dirname(resolved)!==path.resolve(os.tmpdir())||!/^ordered-(memory|cas)-test-/.test(path.basename(resolved)))throw Error('unsafe_test_cleanup');await fs.rm(resolved,{recursive:true,force:true});}
class CASStore{
  constructor(){this.rows=new Map();}
  async read(id){return structuredClone(this.rows.get(id)||null);}
  async cas(id,v,next){if((this.rows.get(id)?.storageVersion??-1)!==v)return false;this.rows.set(id,structuredClone(next));return true;}
}
const event=(n,text='Synthetic question',channel='voice',clientId='client')=>({turnId:'turn-'+n,text,channel,clientId,clientSequence:n,synthetic:true});
async function fixture(options={}){const store=new CASStore(),memory=new OrderedMemory(store,options);await memory.create(id);return {store,memory};}
const answer=(state={},reply='Synthetic answer',extra={})=>({state,reply,links:[],language:'en',...extra});
const context=(extra={})=>({directed:true,relation:'continuation',language:'en',languageOperation:'establish',languageEvidence:null,topicOperation:'retain',topic:{entity:null,location:null,category:null},cancelCurrentBy:null,cancellationEvidence:null,...extra});
const memoryContext=(text='Synthetic question',extra={})=>({current:{turnId:'turn-1',text},future:[],language:null,topic:null,...extra});
const runtime=(text='Synthetic question',state={},extra={})=>new OrderedContextRuntime({artifact:envelope.artifact,publicKnowledge:envelope.publicKnowledge,clock,guest:text,state,memoryContext:memoryContext(text),...extra});
const party=(operation,values={},evidence='Synthetic question')=>({operation,adults:null,children_including_infants:null,non_infant_children:null,infants:null,total_guests:null,infants_mentioned:false,evidence,...values});
const timing=(kind='retain_stay',extra={})=>({kind,start:null,end:null,offset_days:null,week_offset:null,weekdays:[],boundary:null,evidence:null,...extra});
const outcome=(kind='knowledge',extra={})=>({id:'request',kind,description:'Synthetic request',unit_ids:[],booking_operation:'refresh',booking_evidence:null,timing:timing(),unit_scope:null,origin_iata:null,origin_evidence:null,destination_iata:null,action_evidence:null,details:{guide_topic:null,event_category:null,severity:null,message:null,email:null,first_name:null,query:null},...extra});
const usage={input_tokens:10,output_tokens:10,total_tokens:20};
const call=(name,args)=>({type:'function_call',call_id:name, name,arguments:JSON.stringify(args)});
test('ingestion commits before processing, without any model or action call',async()=>{
 const {memory,store}=await fixture();await memory.accept(id,event(1));
 assert.equal((await store.read(id)).events[0].text,'Synthetic question');assert.equal((await memory.status(id)).committed,0);
});
test('duplicate receipt is idempotent; same ID with changed content is rejected',async()=>{
 const {memory}=await fixture();await memory.accept(id,event(1));assert.equal((await memory.accept(id,event(1))).replayed,true);
 await assert.rejects(memory.accept(id,event(1,'Changed')),/collision/);assert.equal((await memory.status(id)).accepted,1);
});
test('per-client gaps are rejected without losing earlier input',async()=>{
 const {memory}=await fixture();await assert.rejects(memory.accept(id,event(2)),/sequence_gap/);await memory.accept(id,event(1));assert.equal((await memory.status(id)).accepted,1);
});
test('concurrent Chat and Voice inputs have one total order and one state',async()=>{
 const {memory,store}=await fixture();await Promise.all([memory.accept(id,{...event(1,'Chat','chat','chat-client'),turnId:'chat-1'}),memory.accept(id,{...event(1,'Voice','voice','voice-client'),turnId:'voice-1'})]);
 for(let n=0;n<2;n++)await memory.process(id,async({state,event})=>answer({count:(state.count||0)+1},event.text));
 const r=await store.read(id);assert.deepEqual(r.events.map(e=>e.sequence),[1,2]);assert.equal(r.state.count,2);assert.equal(r.committed,2);
});
test('rapid independent requests both produce individually retained answers',async()=>{
 const {memory}=await fixture();await memory.accept(id,event(1,'Beach question'));await memory.accept(id,event(2,'Dining question'));
 for(let n=0;n<2;n++)await memory.process(id,async({event})=>answer({},'Answer to '+event.text));
 assert.deepEqual((await memory.status(id)).answers.map(a=>a.reply),['Answer to Beach question','Answer to Dining question']);
});
test('audio cancellation does not cancel accepted input or state commit',async()=>{
 const {memory}=await fixture();await memory.accept(id,event(1));const audio=new AbortController();
 const result=await memory.process(id,async()=>{audio.abort();return answer({saved:true});});
 assert.equal(result.committed,1);assert.equal((await memory.status(id)).answers.length,1);
});
test('new input fences old answer, then reconciles with individually identified future input',async()=>{
 const {memory,store}=await fixture();await memory.accept(id,event(1));
 const old=await memory.process(id,async()=>{await memory.accept(id,event(2,'Separate question'));return answer({wrong:true});});
 assert.equal(old.reconcile,true);assert.deepEqual((await store.read(id)).state,{});
 await memory.process(id,async({future})=>{assert.equal(future[0].text,'Separate question');return answer({right:true});});
 assert.equal((await store.read(id)).state.right,true);
});
test('reconciliation is bounded at three attempts',async()=>{
 const {memory}=await fixture();await memory.accept(id,event(1));let next=2,result;
 for(let n=0;n<3;n++)result=await memory.process(id,async()=>{await memory.accept(id,event(next++));return answer();});
 assert.equal(result.blocked,'input_churn_limit');
});
test('worker lease prevents concurrency; expired worker blocks uncertain usage without retry',async()=>{
 let now=1000;const {memory,store}=await fixture({now:()=>now});await memory.accept(id,event(1));let release,started;
 const ready=new Promise(r=>started=r),hold=new Promise(r=>release=r);
 const first=memory.process(id,async()=>{started();await hold;return answer({stale:true});});await ready;
 assert.equal((await memory.process(id,()=>assert.fail('second worker'))).busy,true);
 now+=180001;assert.equal((await memory.process(id,()=>assert.fail('replayed worker'))).blocked,'worker_interrupted_usage_uncertain');
 release();await first;assert.deepEqual((await store.read(id)).state,{});
});
test('technical failure preserves input, blocks automatic retry and redacts arbitrary error text',async()=>{
 const {memory,store}=await fixture();await memory.accept(id,event(1));await memory.process(id,async()=>{throw Error('unsafe exception detail');});
 assert.equal((await memory.status(id)).blocked,'technical_failure');assert.equal((await store.read(id)).events[0].text,'Synthetic question');
 assert.ok(!JSON.stringify(await store.read(id)).includes('unsafe exception'));await memory.process(id,()=>assert.fail('retry'));
});
test('pending capacity fails explicitly without truncating accepted events',async()=>{
 const {memory}=await fixture({maxPending:1});await memory.accept(id,event(1));await assert.rejects(memory.accept(id,event(2)),/capacity/);assert.equal((await memory.status(id)).accepted,1);
});
test('memory rejects secrets, email, phone, reservation IDs, and extra payload fields',async()=>{
 const {memory}=await fixture();
 for(const text of ['password: secret123','name@example.invalid','312-555-0199','reservation number ABC123'])await assert.rejects(memory.accept(id,event(1,text)));
 await assert.rejects(memory.accept(id,{...event(1),audio:'bytes'}),/invalid_input/);
 assert.throws(()=>assertMemorySafe({doorCode:'1234'}));assert.equal((await memory.status(id)).accepted,0);
});
test('file adapter survives restart, keeps absolute 24h expiry, and physically purges expired records',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ordered-memory-test-'));t.after(()=>removeFixture(root));let now=1000;
 const store=new FileMemoryStore(root,{now:()=>now}),memory=new OrderedMemory(store,{now:()=>now});await memory.create(id);
 await memory.accept(id,event(1));now+=1000;await memory.accept(id,event(2));assert.equal((await store.read(id)).expiresAt,1000+MEMORY_TTL_MS);
 assert.equal((await new FileMemoryStore(root,{now:()=>now}).read(id)).events.length,2);
 now=1000+MEMORY_TTL_MS;assert.equal(await store.read(id),null);await store.purgeExpired();await assert.rejects(fs.stat(store.file(id)),{code:'ENOENT'});
});
test('Redis CAS uses atomic EVAL with fixed PXAT and dedicated namespace; credentials only in header',async()=>{
 const requests=[];const store=new RedisMemoryStore({url:'https://memory.example.invalid',token:'synthetic-token',isolatedPreview:true,now:()=>1,fetchImpl:async(url,options)=>{requests.push(options);return {ok:true,json:async()=>({result:1})};}});
 assert.equal(await store.cas(id,-1,{expiresAt:1000,storageVersion:0}),true);const cmd=JSON.parse(requests[0].body);
 assert.equal(cmd[0],'EVAL');assert.match(cmd[1],/PXAT/);assert.match(cmd[3],/^destiny:synthetic-preview:/);assert.equal(cmd.at(-1),1000);
 assert.ok(!requests[0].body.includes('synthetic-token'));assert.equal(requests[0].redirect,'error');
 assert.throws(()=>new RedisMemoryStore({url:'https://memory.example.invalid',token:'x'}),/dedicated/);
});
test('model must interpret context before domain tools; background cannot act or mutate language',async()=>{
 const r=runtime('Background speech',{}, {memoryContext:memoryContext('Background speech',{language:'es'})});
 assert.equal((await r.tool('browse_hq',{topics:[]})).status,'conversation_context_required');
 await r.tool('interpret_conversation_context',context({directed:false,relation:'background',language:'fr'}));
 assert.equal(r.disposition,'background');assert.equal((await r.tool('browse_hq',{topics:[]})).status,'ignored_input_cannot_act');
 const {memory,store}=await fixture();await memory.accept(id,event(1));await memory.process(id,async()=>answer({bad:true},'bad',{disposition:'background',language:'fr'}));
 assert.equal((await store.read(id)).language,null);assert.deepEqual((await store.read(id)).state,{});
});
test('language establishes once, retains across incidental language, explicit switches need current evidence',async()=>{
 const r=runtime('Hola');await r.tool('interpret_conversation_context',context({language:'es'}));assert.equal(r.contextDecision.language,'es');
 const follow=runtime('bonjour',{}, {memoryContext:memoryContext('bonjour',{language:'es'})});await follow.tool('interpret_conversation_context',context({language:'fr'}));assert.equal(follow.contextDecision.language,'es');
 const sw=runtime('Please speak French',{}, {memoryContext:memoryContext('Please speak French',{language:'es'})});
 assert.equal((await sw.tool('interpret_conversation_context',context({language:'fr',languageOperation:'explicit_switch',languageEvidence:'absent'}))).status,'language_evidence_required');
 await sw.tool('interpret_conversation_context',context({language:'fr',languageOperation:'explicit_switch',languageEvidence:'speak French'}));assert.equal(sw.contextDecision.language,'fr');
});
test('explicit future cancellation suppresses actions but retains both historical inputs',async()=>{
 const {memory,store}=await fixture();await memory.accept(id,event(1,'Find a booking'));await memory.accept(id,event(2,'Cancel that request'));
 await memory.process(id,async({event,future})=>{
  const r=runtime(event.text,{}, {memoryContext:memoryContext(event.text,{future})});
  await r.tool('interpret_conversation_context',context({relation:'cancellation',cancelCurrentBy:future[0].turnId,cancellationEvidence:'Cancel that request'}));
  assert.equal((await r.tool('build_booking_links',{outcome_id:'request'})).status,'ignored_input_cannot_act');
  return answer({},'',{disposition:r.disposition,cancelledBy:future[0].turnId});
 });
 assert.equal((await store.read(id)).events.length,2);assert.equal((await memory.status(id)).answers[0].disposition,'cancelled');
});
test('topic reset drops stale knowledge and pending search while preserving booking state',async()=>{
 const initial=runtime('Synthetic question',{booking:{adults:3,children:0,arrival:'2026-10-05',departure:'2026-10-12'}});
 const pkg=envelope.publicKnowledge.packages.find(p=>!initial.ownerContext.manifest.packageIds.includes(p.id));initial.packages([pkg.id]);
 initial.state.concierge.pendingSearch={offer:'old'};const prior=projectState(initial.state);
 const r=runtime('A new topic',prior,{memoryContext:memoryContext('A new topic',{topic:{entity:'old',location:'old',category:'old'}})});
 await r.tool('interpret_conversation_context',context({relation:'independent',topicOperation:'reset'}));
 assert.equal(r.loadedPackages.length,0);assert.equal(r.state.concierge.pendingSearch,null);assert.equal(projectState(r.state).booking.adults,3);assert.equal(projectState(r.state).booking.arrival,'2026-10-05');
});
test('real executor: split dates, three adults and field-only correction preserve shared state and adapter parity',async()=>{
 const {memory,store}=await fixture();const texts=['October 5th to October 12th.','Just me, my wife, and my sister.','Actually two adults.'];
 const replies=['October 5–12. How many guests?','Three adults for October 5–12.','Updated to two adults, still October 5–12.'];
 for(let i=0;i<3;i++){
  await memory.accept(id,event(i+1,texts[i],i===1?'chat':'voice'));
  const result=await memory.process(id,async({event,state,history,future,assertFresh,recordUsage})=>{
   let n=0;const r=runtime(event.text,state),args={base_revision:r.state.revision,party:i===0?party('retain',{},event.text):party(i===1?'replace':'patch',{adults:i===1?3:2,...(i===1?{children_including_infants:0}:{})},event.text),outcomes:[outcome(i===0?'availability':'knowledge',i===0?{timing:timing('exact_range',{start:'2026-10-05',end:'2026-10-12',evidence:event.text})}:{})]};
   const openai={responses:{create:async()=>({id:'mock-'+(++n),status:'completed',usage,output:n===1?[call('interpret_conversation_context',context())]:n===2?[call('interpret_request',args)]:[],...(n===3?{output_text:replies[i]}:{})})}};
   const out=await executePrivateBrain({text:event.text,session:{id,revision:envelope.revision,version:i,brainState:state,brainHistory:history.flatMap(e=>[{role:'user',content:e.text},{role:'assistant',content:e.result.reply}])},artifact:envelope,openai,services:{},clockProvider:()=>clock,assertFresh,recordUsage,memoryContext:memoryContext(event.text,{future})});
   assert.equal(out.result.failure,null);assert.equal(n,3);
   assert.equal(out.result.presentations.chat.decisionHash,out.result.presentations.voice.decisionHash);
   assert.deepEqual(out.result.presentations.chat.links,out.result.presentations.voice.links);
   return answer(out.session.brainState,out.result.reply,{usage:out.result.trace.usage,language:out.contextDecision.language,relation:out.contextDecision.relation,decisionId:out.result.decisionId});
  });assert.equal(result.committed,i+1);
 }
 const s=(await store.read(id)).state;assert.equal(s.booking.adults,2);assert.equal(s.booking.children,0);assert.equal(s.booking.arrival,'2026-10-05');assert.equal(s.booking.departure,'2026-10-12');
 assert.deepEqual((await memory.status(id)).answers.map(a=>a.reply),replies);
 if(process.env.DESTINY_ORDERED_REPLAY_OUTPUT)await fs.writeFile(process.env.DESTINY_ORDERED_REPLAY_OUTPUT,JSON.stringify({kind:'scripted-model-executor-replay',modelCalls:0,costUsd:0,answers:(await memory.status(id)).answers,state:s,parity:'identical decision hashes and links asserted on all three turns'},null,2));
});
test('missing model usage stops after one request and is recorded for review',async()=>{
 let calls=0;const entries=[];const out=await executePrivateBrain({text:'Hello',session:{id,version:0,revision:envelope.revision},artifact:envelope,services:{},clockProvider:()=>clock,memoryContext:memoryContext('Hello'),recordUsage:async e=>entries.push(e),openai:{responses:{create:async()=>{calls++;return {status:'completed',output:[],output_text:'Hello'};}}}});
 assert.equal(calls,1);assert.equal(out.result.failure,'model_usage_uncertain');assert.deepEqual(entries.map(e=>e.phase),['dispatched','received']);
});
test('client retries a lost ACK with the identical body and caches completed duplicates',async()=>{
 const {memory}=await fixture();let lost=true,accepts=[];const client=new OrderedConversationClient({bootstrapId:id,clientId:'client',wait:async()=>{},request:async(b,ch)=>{
  if(b.op==='bootstrap')return {};
  if(b.op==='accept'){accepts.push(b);const r=await memory.accept(id,{...b,op:undefined,channel:ch});return r;}
 }});
 // Strip transport envelope before the storage contract.
 client.request=async(b,ch)=>{if(b.op==='bootstrap')return {};if(b.op==='accept'){accepts.push(structuredClone(b));const {op,...input}=b;const r=await memory.accept(id,{...input,channel:ch});if(lost){lost=false;throw Error('ACK lost');}return r;}if(b.op==='status')return memory.status(id,b.after);return memory.process(id,async()=>answer());};
 let ack=0;const result=await client.enqueue('Synthetic question','turn-1','voice',{onAccepted:()=>ack++});
 assert.equal(ack,1);assert.deepEqual(accepts[0],accepts[1]);assert.equal((await memory.status(id)).accepted,1);
 assert.deepEqual(await client.enqueue('Synthetic question','turn-1','voice'),result);assert.equal(accepts.length,2);
});
test('client pump rechecks when ACK arrives during an idle status read',async()=>{
 const {memory}=await fixture();let releaseStatus,statusStarted;const ready=new Promise(r=>statusStarted=r);let intercept=true;
 const client=new OrderedConversationClient({bootstrapId:id,clientId:'client',request:async(b,ch)=>{
  if(b.op==='bootstrap')return {};
  if(b.op==='accept'){const {op,...input}=b;return memory.accept(id,{...input,channel:ch});}
  if(b.op==='status'){const s=await memory.status(id,b.after);if(intercept){intercept=false;statusStarted();await new Promise(r=>releaseStatus=r);}return s;}
  return memory.process(id,async()=>answer());
 }});
 const pump=client.pump();await ready;const answerPromise=client.enqueue('Synthetic question','turn-1','voice');await client.acceptLane;releaseStatus();await pump;assert.equal((await answerPromise).sequence,1);
});
test('ambiguous ingestion stops later input from overtaking and does not claim saved status',async()=>{
 let accepts=0,acks=0;const client=new OrderedConversationClient({bootstrapId:id,clientId:'client',wait:async()=>{},request:async b=>{if(b.op==='bootstrap')return {};accepts++;throw Error('transport_failed');}});
 const a=client.enqueue('First','a','voice',{onAccepted:()=>acks++}),b=client.enqueue('Second','b','voice');
 const results=await Promise.allSettled([a,b]);assert.equal(accepts,3);assert.equal(acks,0);assert.ok(results.every(r=>r.status==='rejected'));
});
test('out-of-order transcripts drain in capture order and duplicates do not repeat',()=>{
 const received=[],buffer=new TranscriptOrderBuffer(e=>received.push(e.text));buffer.register('a');buffer.register('b');
 buffer.complete('b',{text:'Party'});assert.deepEqual(received,[]);buffer.complete('a',{text:'Dates'});buffer.complete('a',{text:'Dates'});assert.deepEqual(received,['Dates','Party']);
});
test('missing capture and failed transcription stop ordering; empty transcript advances',()=>{
 const received=[],buffer=new TranscriptOrderBuffer(e=>received.push(e.text));assert.throws(()=>buffer.complete('x',{}),/without_capture/);
 buffer.register('a');buffer.register('b');buffer.complete('b',{text:'Party'});buffer.complete('a',{text:''});assert.deepEqual(received,['','Party']);buffer.fail();assert.throws(()=>buffer.complete('b',{}),/unproven/);
});
test('HTTP handler shares identity across Chat/Voice; denies production, foreign origin and injected authority',async()=>{
 const {memory}=await fixture(),env={DESTINY_ORDERED_MEMORY:'1',VERCEL_ENV:'preview'},handler=createOrderedHandler({memory,key:'k'.repeat(32),env,execute:async()=>answer()});
 async function invoke(channel,body,cookie='',origin='https://example.vercel.app'){
  const res={headers:{},code:200,setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(v){this.body=v;return this;}};
  await handler(channel,{method:'POST',headers:{host:'example.vercel.app',origin,'x-vercel-id':'synthetic',cookie},body},res);return res;
 }
 const boot=await invoke('chat',{op:'bootstrap',bootstrapId:'b'.repeat(64)}),cookie=boot.headers['Set-Cookie'].split(';')[0];
 assert.match(boot.headers['Set-Cookie'],/HttpOnly; SameSite=Strict/);
 const b2=await invoke('voice',{op:'bootstrap'},cookie);assert.equal(b2.headers['Set-Cookie'].split(';')[0],cookie);
 assert.equal((await invoke('voice',{op:'accept',...event(1),channel:undefined},cookie)).code,400);
 assert.equal((await invoke('voice',{op:'status',after:0},cookie,'https://evil.invalid')).code,404);
 assert.equal((await invoke('voice',{op:'process'},cookie)).body.error,'private_model_disabled');
 assert.equal(orderedMemoryEnabled({...env,VERCEL_ENV:'production'}),false);
});

test('file CAS arbitrates competing processes without overwriting accepted input',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ordered-cas-test-'));t.after(()=>removeFixture(root));
 const a=new OrderedMemory(new FileMemoryStore(root)),b=new OrderedMemory(new FileMemoryStore(root));await a.create(id);
 await Promise.all([a.accept(id,{...event(1),turnId:'a',clientId:'a'}),b.accept(id,{...event(1),turnId:'b',clientId:'b'})]);
 assert.equal((await a.status(id)).accepted,2);
});
test('concurrent bootstrap creates one identity and fixed expiration',async()=>{
 const {store}=await fixture();store.rows.clear();const a=new OrderedMemory(store),b=new OrderedMemory(store);
 const [x,y]=await Promise.all([a.create(id),b.create(id)]);assert.equal(x.id,y.id);assert.equal(x.expiresAt,y.expiresAt);assert.equal(store.rows.size,1);
});
test('input stays immutable even if a worker attempts to alter accepted history',async()=>{
 const {memory,store}=await fixture();await memory.accept(id,event(1));await assert.rejects(memory.mutate(id,r=>{r.events[0].text='replacement';}),/immutable_input/);assert.equal((await store.read(id)).events[0].text,'Synthetic question');
});
test('incomplete model response stops without a second request',async()=>{
 let calls=0;const out=await executePrivateBrain({text:'Hello',session:{id,version:0,revision:envelope.revision},artifact:envelope,services:{},clockProvider:()=>clock,memoryContext:memoryContext('Hello'),openai:{responses:{create:async()=>{calls++;return {status:'incomplete',usage,output:[]};}}}});
 assert.equal(calls,1);assert.equal(out.result.failure,'model_response_incomplete');
});
test('background interpretation ends normal model loop without composer or domain call',async()=>{
 let calls=0;const out=await executePrivateBrain({text:'Side conversation',session:{id,version:0,revision:envelope.revision},artifact:envelope,services:{},clockProvider:()=>clock,memoryContext:memoryContext('Side conversation'),openai:{responses:{create:async()=>{calls++;return {status:'completed',usage,output:[call('interpret_conversation_context',context({directed:false,relation:'background'}))]};}}}});
 assert.equal(calls,1);assert.equal(out.result.reply,'');assert.equal(out.disposition,'background');assert.equal(out.result.failure,null);
});
test('expiry clears browser cached transcripts and signals the presentation adapter',async()=>{
 let expired=0;const c=new OrderedConversationClient({request:async()=>({}),bootstrapId:id,clientId:'client',onExpire:()=>expired++});
 c.rows.set('old',{done:true,text:'Synthetic question'});let shown;
 c.listeners.add(s=>shown=s);c.expire();assert.equal(c.rows.size,0);assert.equal(expired,1);assert.equal(shown.expired,true);
});
test('Redis transport errors are generic and never retried',async()=>{
 let calls=0;const store=new RedisMemoryStore({url:'https://memory.example.invalid',token:'synthetic-token',isolatedPreview:true,fetchImpl:async()=>{calls++;return {ok:false};}});
 await assert.rejects(store.read(id),/^Error: memory_transport_failed$/);assert.equal(calls,1);
});
test('new session flag defaults off and production cannot opt in',()=>{
 assert.equal(orderedMemoryEnabled({}),false);assert.equal(orderedMemoryEnabled({DESTINY_ORDERED_MEMORY:'1',VERCEL_ENV:'production'}),false);assert.equal(orderedMemoryEnabled({DESTINY_ORDERED_MEMORY:'1',VERCEL_ENV:'preview'}),true);
});
