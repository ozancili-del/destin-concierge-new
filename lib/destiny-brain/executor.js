import {runContractTurn} from './workflow-runtime.js';
import {validateEnvelope} from './envelope-store.js';
import {PREVIEW_CONTEXT,UNAVAILABLE_CAPABILITIES} from './boundary.js';
import {assertPayloadSafe} from './accepted/vendor/privacy.mjs';
import {OrderedContextRuntime,ORDERED_TOOLS} from './ordered-context.js';

export async function executePrivateBrain({text,session,artifact:envelope,openai,services,signal,turnId,traceId,memoryContext,assertFresh,recordUsage,clockProvider=()=>({now:new Date().toISOString(),timeZone:'America/Chicago',locale:'en-US'})}){
  validateEnvelope(envelope);
  if(!openai?.responses?.create)throw Error('private_model_disabled');
  if(signal?.aborted)throw Error('private_turn_aborted');
  const history=session.brainHistory||[],usage=[];
  const client={responses:{create:async request=>{
    if(signal?.aborted)throw Error('private_turn_aborted');
    assertPayloadSafe(request);
    await recordUsage?.({phase:'dispatched',call:usage.length+1});
    const response=await openai.responses.create({...request,service_tier:'default',stream:false},{signal:AbortSignal.any([AbortSignal.timeout(25000),...(signal?[signal]:[])]),maxRetries:0,timeout:25000});
    const entry={responseId:response.id||null,status:response.status||null,usage:response.usage||null};
    usage.push(entry);await recordUsage?.({phase:'received',call:usage.length,...entry});
    if(memoryContext&&(!['input_tokens','output_tokens','total_tokens'].every(k=>Number.isInteger(response.usage?.[k])&&response.usage[k]>=0)||response.usage.total_tokens!==response.usage.input_tokens+response.usage.output_tokens))throw Error('model_usage_uncertain');
    return response;
  }}};
  const outcome=await runContractTurn({client,artifact:envelope.artifact,publicKnowledge:envelope.publicKnowledge,state:session.brainState||{},guest:text,messages:[{role:'developer',content:PREVIEW_CONTEXT},...history],services,sessionId:session.id,capabilities:{},authorizedBooking:null,clock:clockProvider(),...(memoryContext?{memoryContext,assertFresh,RuntimeClass:OrderedContextRuntime,tools:ORDERED_TOOLS}:{})});
  // Never return an ungrounded draft or a withheld-link diagnostic as a successful
  // preview answer. The failed turn is persisted for replay/audit, without retry.
  const failure=outcome.failure||(outcome.decision.linkWarnings?.length?'output_link_withheld':null);
  const reply=failure?'I couldn’t complete that request in this private preview.':outcome.reply;
  const links=failure?[]:outcome.channels.chat.links.map(l=>l.url);
  const result={version:4,reply,links,status:failure?'unavailable':'complete',failure,decisionId:outcome.decision.hash,revision:session.revision,hqRevision:envelope.hqRevision,domain:outcome.decision.domain,
    presentations:outcome.channels,unavailableCapabilities:[...UNAVAILABLE_CAPABILITIES],trace:{traceId,turnId,route:'accepted-private-brain',workflow:'party-context-patch-v1',tools:outcome.trace,usage,linkWarnings:outcome.decision.linkWarnings||[],failure,physicalAudioTested:false}};
  return {result,contextDecision:outcome.contextDecision,disposition:outcome.disposition,session:{...session,version:session.version+1,brainState:outcome.state,brainHistory:[...history,{role:'user',content:text},{role:'assistant',content:reply}].slice(-30)}};
}
