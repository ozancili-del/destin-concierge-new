import {createDefaultState,STATIC_URLS,todayIso} from '../destiny-agent/business.js';
import {digest,freeze} from './artifact.js';
import {speculativeEvidence,fieldEvidence} from './guest-evidence.js';
import {TURN_SCHEMA,ANSWER_SCHEMA,turnInstructions} from './turn-contract.js';
import {executeDomainAction} from './domain-actions.js';
import {groundAnswer,presentAnswer} from './answer-grounding.js';

const EMPTY={sentences:[],linkIds:[],unknown:false,clarification:null};
const BASE=[fieldEvidence('identity','identity','verified',null,'I’m Destiny Blue, the AI concierge for Destin Condo Getaways at Pelican Beach Resort in Destin, Florida.',{kind:'identity'})];

function normalizeActions(actions){
 const result=[],seen=new Set();let booking=null;
 for(const action of actions||[]){
  if(action.type==='booking'){booking??={type:'booking'};for(const[k,v]of Object.entries(action))if(v!=null)booking[k]=v;continue;}
  const key=action.type==='guide'?`guide:${action.topic}`:action.type;if(seen.has(key))continue;seen.add(key);result.push(action);
 }
 return booking?[booking,...result]:result;
}
function safeJSON(response){if(response.status==='incomplete'||!response.output_text)throw new Error('model_response_incomplete');const data=JSON.parse(response.output_text);if(!data||typeof data!=='object')throw new Error('invalid_model_contract');return data;}

export async function executeConversation({text,history=[],session,artifact,openai,services,authority={grants:[]},traceId,turnId,now=new Date(),signal,revokedFactIds=new Set()}){
 if(!session||!traceId||!turnId||typeof text!=='string'||text.length>12000)throw new Error('runtime_context_invalid');
 const start=performance.now(),retrieved=speculativeEvidence(artifact,text,history,session,{now,revokedFactIds});
 if(session.revision!==retrieved.revision)throw new Error('artifact_revision_mismatch');
 const model=authority.model||'gpt-5.6-sol',trace={model,calls:[],actions:[],retrieval:retrieved.trace,serviceCalls:{},exceptions:[],tokens:{input:0,output:0,cached:0,cacheWrite:0}};
 let state=structuredClone(session.business||createDefaultState()),pendingSearch=session.pendingSearch||null;
 const checked=()=>{if(signal?.aborted)throw new Error('turn_cancelled');};
 const wrappedServices=new Proxy(services||{},{get(t,n){if(['fetchPublishedKnowledge','fetchBlogContent'].includes(n))return ()=>{throw new Error('request_time_knowledge_fetch_forbidden');};const f=t[n];if(typeof f!=='function')return f;return(...a)=>{checked();trace.serviceCalls[n]=(trace.serviceCalls[n]||0)+1;return f.apply(t,a);};}});
 const context={today:todayIso(now),timeZone:'America/Chicago',trip:state.booking,flight:state.flight,pendingSearch,previousTopic:session.topic||null,offeredEntityIds:session.offeredEntityIds||[]};
 const evidence=[...BASE,...retrieved.evidence],links=[{id:'static.beachcam',url:STATIC_URLS.liveBeachCam,label:'Live beach camera'}];
 const ask=async(stage,input,schema,retry=false)=>{
  checked();const payload={model,store:false,reasoning:{effort:'low'},instructions:turnInstructions({today:context.today,stage}),input:JSON.stringify(input),text:{format:{type:'json_schema',name:stage==='decision'?'domain_turn':'guest_composition',strict:true,schema}},max_output_tokens:2600};
  const began=performance.now(),record={stage,retry,inputBytes:JSON.stringify(payload).length};trace.calls.push(record);
  try{const response=await openai.responses.create(payload,{signal:AbortSignal.any([AbortSignal.timeout(35000),...(signal?[signal]:[])])});Object.assign(record,{responseId:response.id,status:response.status,usage:response.usage});const u=response.usage||{};trace.tokens.input+=u.input_tokens||0;trace.tokens.output+=u.output_tokens||0;trace.tokens.cached+=u.input_tokens_details?.cached_tokens||0;trace.tokens.cacheWrite+=u.input_tokens_details?.cache_write_tokens||0;return safeJSON(response);}
  catch(e){record.error=String(e.message).slice(0,200);if(!retry&&/incomplete|JSON|Unexpected|invalid_model_contract/.test(record.error)){trace.exceptions.push('exceptional_model_validation_retry');return ask(stage,input,schema,true);}throw e;}
  finally{record.elapsedMs=performance.now()-began;}
 };
 const boundedHistory=history.slice(-12).map(m=>({role:m.role,content:String(m.content).slice(0,1800)}));
 let decision,answer,outcomes=[];
 try{
  decision=await ask('decision',{message:text,history:boundedHistory,context,evidence,links},TURN_SCHEMA);
  if(!Array.isArray(decision.actions)||decision.actions.length>6||!decision.answer)throw new Error('invalid_model_contract');
  const actions=normalizeActions(decision.actions);
  const run=async a=>{const began=performance.now();try{const r=await executeDomainAction(a,{state,session:{...session,pendingSearch},services:wrappedServices,authority,now,signal,text,history:boundedHistory,evidence});return {...r,args:a};}catch(e){return {type:a.type,args:a,status:'unavailable',completed:false,evidence:[fieldEvidence(`failure.${a.type}`,a.type,'unavailable',null,'That check could not be completed.',{kind:'action'})],links:[],error:String(e.message),modelTrace:e.modelTrace||null,elapsedMs:performance.now()-began};}};
  if(actions.length){
   // Booking and independent reads overlap. Link actions that inherit the new
   // trip wait for its atomic transaction, then share one final composition.
   const hasBooking=actions.some(a=>a.type==='booking'),dependent=actions.filter(a=>hasBooking&&['flight','activity'].includes(a.type)),independent=actions.filter(a=>!dependent.includes(a));
   outcomes=await Promise.all(independent.map(run));
   const booking=outcomes.find(o=>o.type==='booking');if(booking?.state)state=booking.state;
   outcomes.push(...await Promise.all(dependent.map(run)));
   for(const o of outcomes){if(o.flightPatch)state.flight={...state.flight,...o.flightPatch};if(Object.hasOwn(o,'pendingSearch'))pendingSearch=o.pendingSearch;evidence.push(...o.evidence);links.push(...o.links);trace.actions.push({type:o.type,status:o.status,completed:o.completed,elapsedMs:o.elapsedMs,repairs:o.repairs||[]});}
   const providerCalls=outcomes.filter(o=>o.modelTrace);
   if(providerCalls.length){
    // A model-backed search has already used the second model call. Its cited
    // result is terminal; never hide a third model call for polishing it.
    for(const o of providerCalls){const u=o.modelTrace.usage||{};trace.calls.push({stage:'provider_search',...o.modelTrace});trace.tokens.input+=u.input_tokens||0;trace.tokens.output+=u.output_tokens||0;trace.tokens.cached+=u.input_tokens_details?.cached_tokens||0;trace.tokens.cacheWrite+=u.input_tokens_details?.cache_write_tokens||0;}
    answer={...EMPTY,sentences:[...(decision.answer.sentences||[]),...outcomes.flatMap(o=>o.evidence.map(e=>({evidenceId:e.id,chat:e.text,voice:e.text})))],linkIds:links.filter(l=>l.required).map(l=>l.id)};
   }else answer=await ask('composition',{message:text,history:boundedHistory,context:{...context,trip:state.booking,flight:state.flight,pendingSearch},actionResults:outcomes.map(o=>({type:o.type,status:o.status,completed:o.completed,fields:o.fields||null,query:o.query||null,requiredEvidenceIds:o.requiredEvidenceIds||[]})),evidence,links},ANSWER_SCHEMA);
  }else answer=decision.answer;
 }catch(e){trace.exceptions.push(String(e.message).slice(0,200));answer={...EMPTY,unknown:true};}
 checked();
 const requiredEvidenceIds=outcomes.flatMap(o=>o.requiredEvidenceIds||o.evidence.filter(e=>['booking','safety','clarification','price'].includes(e.kind)).map(e=>e.id));
 const grounded=groundAnswer(answer,evidence,links,{requiredEvidenceIds});
 const chat=presentAnswer(grounded,'chat'),voice=presentAnswer(grounded,'voice');
 const decisionId=digest({revision:session.revision,claims:grounded.claimIds,links:grounded.links.map(l=>l.url),outcomes:outcomes.map(o=>({type:o.type,status:o.status,fields:o.fields||null,query:o.query||null})),trip:state.booking});
 trace.modelCalls=trace.calls.length;trace.expectedBudget=outcomes.length?2:1;trace.withinOrdinaryBudget=trace.modelCalls<=trace.expectedBudget;trace.groundingSubstitutions=grounded.violations;trace.elapsedMs=performance.now()-start;trace.actionCompletion=outcomes.every(o=>o.completed);trace.retrievalMs=retrieved.trace.elapsedMs;trace.githubReads=0;trace.nestedAgentCalls=0;
 const domain=freeze({version:3,traceId,turnId,revision:session.revision,decisionId,topic:decision?.topic||'conversation',status:trace.exceptions.length?'partial':outcomes.some(o=>!o.completed)?'partial':'complete',answer:grounded,reply:chat.text,links:grounded.links.map(l=>l.url),presentations:{chat,voice},evidence,outcomes:outcomes.map(({state,...o})=>o),trace,debug:{model,agentError:trace.exceptions.length?trace.exceptions.join('; '):null}});
 const usedEntities=grounded.sentences.map(s=>s.entityId).filter(Boolean),offered=decision?.topic==='recommendations'?[...new Set([...(session.offeredEntityIds||[]),...usedEntities])]:session.offeredEntityIds||[];
 return {result:domain,session:{...session,version:session.version+1,business:state,pendingSearch,topic:decision?.topic||session.topic,offeredEntityIds:offered,history:[...history,{role:'user',content:text},{role:'assistant',content:chat.text}].slice(-24)}};
}

export function adaptChannel(domain,channel){
 if(!['chat','voice'].includes(channel))throw new Error('invalid_channel');
 if(domain.version!==3)return {...structuredClone(domain),channel,presentation:{text:domain.reply,links:domain.links}};
 const result=structuredClone(domain),presentation=result.presentations[channel];
 return {...result,channel,reply:presentation.text,presentation};
}
