import {runContractTurn} from './accepted/runtime.mjs';
import {validateEnvelope} from './envelope-store.js';
import {PREVIEW_CONTEXT,UNAVAILABLE_CAPABILITIES} from './boundary.js';
import {assertPayloadSafe} from './accepted/vendor/privacy.mjs';

export async function executePrivateBrain({text,session,artifact:envelope,openai,services,signal,turnId,traceId,clockProvider=()=>({now:new Date().toISOString(),timeZone:'America/Chicago',locale:'en-US'})}){
  validateEnvelope(envelope);
  if(!openai?.responses?.create)throw Error('private_model_disabled');
  if(signal?.aborted)throw Error('private_turn_aborted');
  const history=session.brainHistory||[],usage=[];
  const client={responses:{create:async request=>{
    if(signal?.aborted)throw Error('private_turn_aborted');
    assertPayloadSafe(request);
    const response=await openai.responses.create({...request,service_tier:'default',stream:false},{signal:AbortSignal.any([AbortSignal.timeout(25000),...(signal?[signal]:[])]),maxRetries:0,timeout:25000});
    usage.push({responseId:response.id||null,status:response.status||null,usage:response.usage||null});return response;
  }}};
  const outcome=await runContractTurn({client,artifact:envelope.artifact,publicKnowledge:envelope.publicKnowledge,state:session.brainState||{},guest:text,messages:[{role:'developer',content:PREVIEW_CONTEXT},...history],services,sessionId:session.id,capabilities:{},authorizedBooking:null,clock:clockProvider()});
  // Never return an ungrounded draft or a withheld-link diagnostic as a successful
  // preview answer. The failed turn is persisted for replay/audit, without retry.
  const failure=outcome.failure||(outcome.decision.linkWarnings?.length?'output_link_withheld':null);
  const reply=failure?'I couldn’t complete that request in this private preview.':outcome.reply;
  const links=failure?[]:outcome.channels.chat.links.map(l=>l.url);
  const result={version:4,reply,links,status:failure?'unavailable':'complete',failure,decisionId:outcome.decision.hash,revision:session.revision,hqRevision:envelope.hqRevision,domain:outcome.decision.domain,
    presentations:outcome.channels,unavailableCapabilities:[...UNAVAILABLE_CAPABILITIES],trace:{traceId,turnId,route:'accepted-private-brain',tools:outcome.trace,usage,linkWarnings:outcome.decision.linkWarnings||[],failure,physicalAudioTested:false}};
  return {result,session:{...session,version:session.version+1,brainState:outcome.state,brainHistory:[...history,{role:'user',content:text},{role:'assistant',content:reply}].slice(-30)}};
}
