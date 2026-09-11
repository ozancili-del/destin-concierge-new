// The accepted model loop is retained in full; only runtime and tool schema injection differ.
// Frozen accepted sources and their manifest remain immutable.
import {PartyWorkflowRuntime,WORKFLOW_TOOLS} from './party-workflow.js';
import {hash,stable,requireContract,ContractError,projectState} from './accepted/kernel.mjs';
import {acceptAnswer,present} from './accepted/answer.mjs';
import {assertPayloadSafe} from './accepted/vendor/privacy.mjs';
import {assertOwnerContextInput} from './accepted/owner-context.mjs';
export async function runContractTurn({client,model='gpt-5.6-sol',reasoning='low',maxRounds=6,maxToolCalls=16,evaluation=null,...options}) {
  requireContract(client?.responses?.create,'injected_client_required');
  const runtime=new PartyWorkflowRuntime(options),input=runtime.input(),seen=new Map();let failure=null,decision=null;
  for(let round=0;round<maxRounds;round++){
    let response;
    try{evaluation?.assertOpen();runtime.syncKnowledgeInput(input);assertOwnerContextInput(input,runtime.ownerContext);const request={model,reasoning:{effort:reasoning},text:{verbosity:'low'},input,tools:WORKFLOW_TOOLS,tool_choice:'auto',parallel_tool_calls:false,store:false,max_output_tokens:2400};assertPayloadSafe(request);response=await client.responses.create(request);}catch(e){failure=e instanceof ContractError?e.code:'model_transport_failed';break;}
    const output=response.output||[],calls=output.filter(o=>o.type==='function_call');
    const text=response.output_text||output.flatMap(o=>o.content||[]).filter(c=>c.type==='output_text').map(c=>c.text).join('\n');
    if(response.status&&response.status!=='completed'){failure='model_response_incomplete';break;}
    if(!calls.length){try{requireContract(!runtime.workflowFailure,runtime.workflowFailure);decision=acceptAnswer(runtime,text);evaluation?.observeDecision(decision);}catch(e){failure=e instanceof ContractError?e.code:'output_privacy_blocked';}break;}
    // No draft+rewrite path: ambiguous mixed output stops without showing a draft.
    if(text.trim()){failure='mixed_answer_and_action_response';break;}
    input.push(...output);
    for(const call of calls){
      if(runtime.trace.length>=maxToolCalls){failure='tool_call_limit';break;}
      let args,result;try{args=JSON.parse(call.arguments);}catch{result={ok:false,status:'malformed_arguments'};}
      const signature=args?call.name+':'+stable(args):null;
      if(!result){if(seen.has(signature))result=seen.get(signature);else{result=await runtime.tool(call.name,args);seen.set(signature,result);}}
      runtime.trace.push({round,name:call.name,args,result});
      evaluation?.observeTool({name:call.name,args,result});
      input.push({type:'function_call_output',call_id:call.call_id,output:JSON.stringify(result)});
      if(evaluation?.stopped){failure='evaluation_stopped';break;}
    }
    if(failure)break;
  }
  if(!decision){failure||='round_limit_without_answer';decision={text:'',links:[],domain:[...new Set(runtime.outcomes.map(o=>o.kind))],revision:runtime.state.revision,state:projectState(runtime.state),status:'error'};decision.hash=hash(decision);}
  if(failure)evaluation?.trip('runtime_failure',{failure,trace:runtime.trace});
  return {decision,reply:decision.text,state:projectState(runtime.state),trace:runtime.trace,channels:{chat:present(decision,'chat'),voice:present(decision,'voice')},failure,toolResults:[...runtime.engine.evidence.values()]};
}
