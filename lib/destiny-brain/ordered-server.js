import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import OpenAI from 'openai';
import envelope from './accepted/preview-envelope.json' with {type:'json'};
import {FileMemoryStore,RedisMemoryStore} from './memory-store.js';
import {OrderedMemory} from './ordered-memory.js';
import {executePrivateBrain} from './executor.js';
import {brokerClient,brokerServices} from './broker-client.js';
import {createBrainReadServices} from './read-services.js';
import {isPrivatePeer} from './boundary.js';
const COOKIE='destiny_ordered_preview_v1';
export const orderedMemoryEnabled=(env=process.env)=>env.DESTINY_ORDERED_MEMORY==='1'&&env.VERCEL_ENV!=='production';
const sign=(text,key)=>createHmac('sha256',key).update(text).digest('hex');
export function createOrderedHandler({memory,key,execute,env=process.env,now=Date.now}){
  if(!key||key.length<32)throw Error('ordered_memory_signing_key_required');
  function identity(req){
    const raw=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
    if(!raw)return null;const [id,expires,sig,...extra]=raw.split('.'),expected=sign(id+'.'+expires,key);
    if(extra.length||!/^[a-f0-9]{64}$/.test(id)||!/^\d{13}$/.test(expires)||!/^[a-f0-9]{64}$/.test(sig||'')||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected))||Number(expires)<=now())throw Error('conversation_expired');return id;
  }
  return async(channel,req,res)=>{
    res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');
    const host=String(req.headers.host||''),hosted=env.VERCEL_ENV==='preview';
    if(!orderedMemoryEnabled(env)||!['chat','voice'].includes(channel)||(hosted?!host.endsWith('.vercel.app')||!req.headers['x-vercel-id']||req.headers.origin!=='https://'+host:!isPrivatePeer(req,env)||req.headers.origin!=='http://'+host))return res.status(404).json({error:'not_found'});
    if(req.method!=='POST')return res.status(405).json({error:'post_required'});
    try{
      const b=req.body||{};if(JSON.stringify(b).length>18000)throw Error('invalid_input');
      const fields={bootstrap:['op','bootstrapId'],accept:['op','text','turnId','clientId','clientSequence','synthetic'],status:['op','after'],process:['op']};
      if(!fields[b.op]||Object.keys(b).some(k=>!fields[b.op].includes(k)))throw Error('invalid_input');
      if(b.op==='accept'&&[env.OPENAI_API_KEY,env.DESTINY_PREVIEW_MEMORY_REST_TOKEN,key].some(s=>s&&String(b.text).includes(s)))throw Error('invalid_input');
      let id;
      try{id=identity(req);}catch(e){if(b.op!=='bootstrap')throw e;}
      if(b.op==='bootstrap'){
        if(!id){if(!/^[a-f0-9]{64}$/.test(b.bootstrapId||''))throw Error('invalid_bootstrap');id=sign('synthetic-preview:'+b.bootstrapId,key);}
        const r=await memory.create(id);
        const unsigned=id+'.'+r.expiresAt;
        res.setHeader('Set-Cookie',`${COOKIE}=${unsigned}.${sign(unsigned,key)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.max(0,Math.floor((r.expiresAt-now())/1000))}${hosted?'; Secure':''}`);
        return res.json({ready:true,expiresAt:r.expiresAt,...await memory.status(id)});
      }
      if(!id)throw Error('conversation_missing');
      if(b.op==='accept')return res.status(202).json(await memory.accept(id,{text:b.text,turnId:b.turnId,clientId:b.clientId,clientSequence:b.clientSequence,synthetic:b.synthetic,channel}));
      if(b.op==='status'){if(!Number.isInteger(b.after)||b.after<0)throw Error('invalid_input');return res.json(await memory.status(id,b.after));}
      if(b.op==='process'){
        if(env.DESTINY_PRIVATE_MODEL_CALLS!=='1')return res.status(503).json({error:'private_model_disabled'});
        const result=await memory.process(id,args=>execute({...args,id}));return res.json(result);
      }
      throw Error('invalid_operation');
    }catch(e){const code=e.message;const allowed=['conversation_expired','conversation_missing','turn_id_collision','client_sequence_gap','memory_capacity','memory_conflict_retry','invalid_input','invalid_bootstrap','invalid_operation'];return res.status(code==='memory_capacity'?429:code.includes('collision')||code.includes('gap')||code.includes('conflict')?409:allowed.includes(code)?400:503).json({error:allowed.includes(code)?code:'ordered_memory_unavailable'});}
  };
}
let handler;
export async function serveOrderedPreview(channel,req,res){
  if(!orderedMemoryEnabled())return res.status(404).json({error:'not_found'});
  try{
    if(!handler){
      const env=process.env,key=env.DESTINY_ORDERED_MEMORY_SIGNING_KEY;
      let store;
      if(env.VERCEL_ENV==='preview'){
        // No shared/GuestView/production credential fallback is permitted.
        store=new RedisMemoryStore({url:env.DESTINY_PREVIEW_MEMORY_REST_URL,token:env.DESTINY_PREVIEW_MEMORY_REST_TOKEN,isolatedPreview:env.DESTINY_PREVIEW_MEMORY_ISOLATED==='1'});
      }else{store=new FileMemoryStore(env.DESTINY_ORDERED_MEMORY_ROOT);await store.purgeExpired();store.startCleanup();}
      const memory=new OrderedMemory(store);let client;
      handler=createOrderedHandler({memory,key,env,execute:async({id,event,state,language,topic,history,future,assertFresh,recordUsage})=>{
        client??=env.DESTINY_PRIVATE_BROKER_URL?brokerClient(env):new OpenAI({apiKey:env.OPENAI_API_KEY,maxRetries:0,timeout:25000});
        const brainHistory=history.filter(e=>e.result?.disposition!=='background').flatMap(e=>[{role:'user',content:e.text},...(e.result?.reply?[{role:'assistant',content:e.result.reply}]:[])]).slice(-40);
        const out=await executePrivateBrain({text:event.text,session:{id,version:event.sequence-1,revision:envelope.revision,brainState:state,brainHistory},artifact:envelope,openai:client,services:env.DESTINY_PRIVATE_BROKER_URL?brokerServices(env):createBrainReadServices({env}),turnId:event.turnId,traceId:randomBytes(16).toString('hex'),assertFresh,recordUsage,memoryContext:{current:{turnId:event.turnId,text:event.text},future:future.map(e=>({turnId:e.turnId,text:e.text})),language,topic}});
        return {state:out.session.brainState,reply:out.result.reply,links:out.result.links,decisionId:out.result.decisionId,failure:out.result.failure,disposition:out.disposition,relation:out.contextDecision?.relation,language:out.contextDecision?.language,topic:out.contextDecision?.topic,cancelledBy:out.contextDecision?.cancelCurrentBy,usage:out.result.trace.usage};
      }});
    }
    return handler(channel,req,res);
  }catch{return res.status(503).json({error:'ordered_memory_unconfigured'});}
}
