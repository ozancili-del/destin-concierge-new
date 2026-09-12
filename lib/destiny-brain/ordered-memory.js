import {randomUUID} from 'node:crypto';
import {MEMORY_TTL_MS} from './memory-store.js';
import {assertPayloadSafe} from './accepted/vendor/privacy.mjs';
import {assertState} from './accepted/kernel.mjs';
export function assertMemorySafe(payload){
  assertPayloadSafe(payload);
  const text=JSON.stringify(payload);
  if(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|\b(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b|\b(?:reservation|confirmation)\s*(?:number|code|id|#)\s*[:=]?\s*[A-Z0-9-]{4,}/i.test(text))throw Error('private_memory_sensitive_input');
}
const idOk=id=>typeof id==='string'&&/^[a-zA-Z0-9._:-]{1,120}$/.test(id);
const immutable=e=>JSON.stringify([e.turnId,e.text,e.channel,e.clientId,e.clientSequence,e.acceptedAt,e.sequence]);
export class OrderedMemory{
  constructor(store,{now=Date.now,maxEvents=256,maxPending=16}={}){this.store=store;this.now=now;this.maxEvents=maxEvents;this.maxPending=maxPending;}
  async mutate(id,operation){
    for(let attempt=0;attempt<24;attempt++){
      const old=await this.store.read(id);if(!old)throw Error('conversation_expired');
      const next=structuredClone(old),result=operation(next);
      if(result?.unchanged)return result.value;
      if(next.events.length<old.events.length||old.events.some((e,i)=>immutable(e)!==immutable(next.events[i])))throw Error('immutable_input_violation');
      next.storageVersion=old.storageVersion+1;
      if(next.expiresAt!==old.expiresAt||JSON.stringify(next).length>1500000)throw Error('memory_capacity');
      if(await this.store.cas(id,old.storageVersion,next))return result;
    }
    throw Error('memory_conflict_retry');
  }
  async create(id,initial={}){
    assertMemorySafe(initial);const old=await this.store.read(id);if(old)return old;
    const r={id,storageVersion:0,expiresAt:this.now()+MEMORY_TTL_MS,events:[],committed:0,state:initial,language:null,topic:null,audit:[],worker:null,blocked:null};
    if(await this.store.cas(id,-1,r))return r;return this.store.read(id);
  }
  async accept(id,input){
    if(Object.keys(input).some(k=>!['text','turnId','channel','clientId','clientSequence','synthetic'].includes(k))||input.synthetic!==true||!idOk(input.turnId)||!idOk(input.clientId)||!['chat','voice'].includes(input.channel)||!Number.isInteger(input.clientSequence)||input.clientSequence<1||typeof input.text!=='string'||!input.text.trim()||input.text.length>12000)throw Error('invalid_input');
    assertMemorySafe({text:input.text});
    return this.mutate(id,r=>{
      const prior=r.events.find(e=>e.turnId===input.turnId);
      if(prior){if(prior.text!==input.text||prior.clientId!==input.clientId||prior.clientSequence!==input.clientSequence||prior.channel!==input.channel)throw Error('turn_id_collision');return {unchanged:true,value:{sequence:prior.sequence,turnId:prior.turnId,replayed:true}};}
      const expected=Math.max(0,...r.events.filter(e=>e.clientId===input.clientId).map(e=>e.clientSequence))+1;
      if(input.clientSequence!==expected)throw Error('client_sequence_gap');
      if(r.events.length>=this.maxEvents||r.events.length-r.committed>=this.maxPending)throw Error('memory_capacity');
      const event={text:input.text,turnId:input.turnId,channel:input.channel,clientId:input.clientId,clientSequence:input.clientSequence,sequence:r.events.length+1,acceptedAt:new Date(this.now()).toISOString(),result:null};
      r.events.push(event);return {sequence:event.sequence,turnId:event.turnId,replayed:false};
    });
  }
  async status(id,after=0){const r=await this.store.read(id);if(!r)throw Error('conversation_expired');return {accepted:r.events.length,committed:r.committed,pending:r.events.length-r.committed,blocked:r.blocked,expiresAt:r.expiresAt,answers:r.events.filter(e=>e.sequence>after&&e.result).map(e=>({sequence:e.sequence,turnId:e.turnId,question:e.text,...e.result}))};}
  async process(id,execute){
    const fence=randomUUID();
    const claim=await this.mutate(id,r=>{
      if(r.blocked)return {unchanged:true,value:{blocked:r.blocked}};
      if(r.worker){if(r.worker.until<=this.now()){r.blocked='worker_interrupted_usage_uncertain';r.audit.push({kind:r.blocked,sequence:r.committed+1});return {blocked:r.blocked};}return {unchanged:true,value:{busy:true}};}
      if(r.committed===r.events.length)return {unchanged:true,value:{idle:true}};
      r.worker={fence,until:this.now()+180000,sequence:r.committed+1,tail:r.events.length};
      r.audit.push({kind:'worker_started',sequence:r.committed+1,fence});
      return {event:structuredClone(r.events[r.committed]),snapshot:structuredClone(r),fence};
    });
    if(!claim.event)return claim;
    const {snapshot,event}=claim;
    const assertFresh=async()=>{const r=await this.store.read(id);if(!r||r.worker?.fence!==fence||r.worker.until<=this.now())throw Error('worker_fence_lost');if(r.events.length!==snapshot.events.length)throw Error('new_input_pending');};
    const recordUsage=async entry=>this.mutate(id,r=>{
      if(r.worker?.fence!==fence)throw Error('worker_fence_lost');
      r.audit.push({kind:'model_call',sequence:event.sequence,...entry});return null;
    });
    let output;
    try{
      output=await execute({event,state:structuredClone(snapshot.state),language:snapshot.language,topic:snapshot.topic,
        history:snapshot.events.slice(0,snapshot.committed),future:snapshot.events.slice(snapshot.committed+1),assertFresh,recordUsage});
      await assertFresh();
      if(output.failure)throw Error(output.failure);
      if(output.state?.contract)assertState(output.state.contract);
      // The approved HQ may contain public support contacts. Sensitive guest
      // input is rejected at ingestion; retain the existing output secret guard.
      assertPayloadSafe({reply:output.reply,links:output.links,state:output.state});
      if(typeof output.reply!=='string'||!output.state||typeof output.state!=='object')throw Error('invalid_worker_result');
      return await this.mutate(id,r=>{
        if(r.worker?.fence!==fence||r.committed+1!==event.sequence||r.events.length!==snapshot.events.length)throw Error('new_input_pending');
        const ignored=output.disposition==='background',cancelled=output.disposition==='cancelled';
        if(!ignored&&!cancelled){r.state=output.state;r.language=output.language??r.language;r.topic=output.topic??null;}
        const result={reply:ignored||cancelled?'':output.reply,links:ignored||cancelled?[]:output.links||[],disposition:output.disposition||'answered',relation:output.relation||'independent',cancelledBy:output.cancelledBy||null,decisionId:output.decisionId||null};
        r.events[event.sequence-1].result=result;r.committed=event.sequence;r.worker=null;r.audit.push({kind:'committed',sequence:event.sequence,disposition:result.disposition,usage:output.usage||[]});
        return {committed:r.committed};
      });
    }catch(e){
      const known=['new_input_pending','worker_fence_lost','model_usage_uncertain','model_transport_failed','model_response_incomplete','output_link_withheld','invalid_worker_result','conversation_context_required','round_limit_without_answer','mixed_answer_and_action_response','tool_call_limit'];
      const reason=known.includes(e.message)?e.message:'technical_failure';
      await this.mutate(id,r=>{
        if(r.worker?.fence!==fence)return {unchanged:true,value:null};
        r.audit.push({kind:'attempt_stopped',sequence:event.sequence,reason,usage:output?.usage||[]});
        r.worker=null;
        // New accepted meaning is a reconciliation, not a transport retry.
        // All other failures stop automatic execution, including unknown usage.
        const reconciliations=r.audit.filter(a=>a.kind==='attempt_stopped'&&a.sequence===event.sequence&&a.reason==='new_input_pending').length;
        if(reason!=='new_input_pending')r.blocked=reason;
        else if(reconciliations>=3)r.blocked='input_churn_limit';
        return null;
      });
      const status=await this.status(id);
      return {pending:true,...(status.blocked?{blocked:status.blocked}:{reconcile:true})};
    }
  }
}
