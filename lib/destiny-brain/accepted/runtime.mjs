import {knowledgeStore} from './knowledge.mjs';
import {POLICY} from './policy.mjs';
import {interpretRequest} from './interpret.mjs';
import {executeSearchContract} from './vendor/owner-rules.mjs';
import {hydrate,hash,stable,requireContract,ContractError,projectState} from './kernel.mjs';
import {TOOLS,validate} from './schema.mjs';
import {Actions} from './actions.mjs';
import {domainAdapters} from './adapters.mjs';
import {acceptAnswer,present} from './answer.mjs';
import {compilePublicKnowledge,validatePublicKnowledge,KnowledgeScope,COMPOSITION_GUIDANCE} from './public-knowledge.mjs';
import {assertPayloadSafe} from './vendor/privacy.mjs';
import {compileOwnerContext,attachOwnerContext,assertOwnerContextInput} from './owner-context.mjs';

export class ContractRuntime {
  constructor({artifact,state={},services={},clock,guest,messages=[],capabilities={},sessionId='synthetic-local',authorizedBooking=null,initialPackageIds=[],publicKnowledge=null}) {
    assertPayloadSafe({artifact,state,guest,messages});
    this.ownerContext=compileOwnerContext(artifact);
    const compiled=publicKnowledge??compilePublicKnowledge(artifact);validatePublicKnowledge(compiled,artifact);
    this.knowledgeScope=new KnowledgeScope(compiled);
    this.knowledgeScope.hydrate(this.ownerContext.manifest.packageIds);
    this.state=hydrate(state);this.clock=clock;this.guest=guest;this.messages=messages;this.artifact=artifact;this.store=knowledgeStore(artifact,compiled);this.outcomes=[];this.trace=[];this.actionsStarted=false;
    // Capabilities are injected by the server, never by the model or request body.
    this.services={...services,domainAdapters:domainAdapters(services,{capabilities,sessionId,authorizedBooking,knowledgeScope:this.knowledgeScope})};
    this.engine=new Actions({state:this.state,services:this.services,clock,outcomes:this.outcomes});
    const revision=hash(artifact);this.state.knowledge=this.state.knowledge.revision===revision?this.state.knowledge:{revision,entityIds:[]};
    this.state.concierge.turn++;this.engine.state=this.state;
    // Restore server-approved scope atomically, including known empty records.
    // Tool lookup states below govern new model requests, not scope restoration.
    this.knowledgeScope.hydrate([...new Set([...this.state.knowledge.entityIds,...initialPackageIds])]);
    this.state.knowledge.entityIds=this.loadedPackages.map(p=>p.id);
  }
  get loadedPackages(){return this.knowledgeScope.packages().filter(p=>!this.ownerContext.manifest.packageIds.includes(p.id));}
  knowledgeInput(){const snapshot=this.knowledgeScope.modelSnapshot();this.knowledgeScope.assertModelSnapshot(snapshot);return {role:'developer',content:'SCOPED APPROVED HQ KNOWLEDGE\n'+JSON.stringify({...snapshot,compositionGuidance:'Use the primary COMPOSITION CONTRACT; these complete packages are reference material.'})};}
  input(){const {results,...canonicalState}=this.state;return attachOwnerContext([{role:'developer',content:POLICY},{role:'developer',content:JSON.stringify({approvedHqIndex:this.store.index,clock:this.clock,canonicalState,historicalResults:results.map(r=>({...r,historical:true,availabilityConfirmedThisTurn:false})),serverCapabilities:'Only exposed tools with explicit server permission may deliver actions. Previous observations are historical.'})},this.knowledgeInput(),...this.messages,{role:'user',content:this.guest}],this.ownerContext);}
  syncKnowledgeInput(input){
    const at=input.findIndex(m=>m.role==='developer'&&m.content?.startsWith('SCOPED APPROVED HQ KNOWLEDGE\n'));
    requireContract(at>=0,'model_context_authority_missing');input[at]=this.knowledgeInput();
    const block=JSON.parse(input[at].content.split('\n').slice(1).join('\n'));const {compositionGuidance,...snapshot}=block;this.knowledgeScope.assertModelSnapshot(snapshot);
  }
  packages(ids,context='general'){
    const check=this.store.inspect(ids,context);if(check.knowledgeState!=='data')return check;
    if(context==='booking')this.knowledgeScope.hydrateBooking(ids);
    else if(context==='pricing')this.knowledgeScope.hydratePricing(ids);
    else this.knowledgeScope.hydrate(ids);
    const packages=this.knowledgeScope.modelPackages(ids);this.state.knowledge.entityIds=this.loadedPackages.map(p=>p.id);
    return {...check,packages,links:packages.flatMap(p=>p.publicLinks)};
  }
  interpret(args){return interpretRequest.call(this,args);}
  async tool(name,rawArgs){
    try{
      assertPayloadSafe(rawArgs);
      const schema=TOOLS.find(t=>t.name===name);requireContract(schema,'unknown_tool');const args=validate(schema.parameters,rawArgs);
      if(name==='browse_hq')return this.store.browse(args.topics);
      if(name==='get_hq_packages')return this.packages(args.entity_ids);
      if(name==='get_hq_booking_terms'){
        return {...this.packages(args.entity_ids,'booking'),relevance:args.relevance};
      }
      if(name==='get_hq_pricing'){
        return {...this.packages(args.entity_ids,'pricing'),relevance:args.relevance};
      }
      if(name==='interpret_request')return this.interpret(args);
      requireContract(this.outcomes.length,'interpret_request_required');this.actionsStarted=true;
      let result;
      if(['offer_targeted_search','search_unknown_entity'].includes(name)){
        this.engine.outcome(args.outcome_id,['search']);
        const r=await executeSearchContract(name,{...args,consent:'confirmed'},{concierge:this.state.concierge,latestUser:this.guest,services:this.services,makeId:hash});assertPayloadSafe(r);
        result=this.engine.add('action',args.outcome_id,r.status,r.status==='success'?{...r.data,facts:r.facts||[]}:{...r.data},{links:r.status==='success'?(r.urls||[]).map(url=>{requireContract(new URL(url).protocol==='https:','invalid_service_link');return {url};}):[]});
      }else result=await this.engine.execute(name,args);
      this.state=this.engine.state;assertPayloadSafe(result);return result;
    }catch(e){return {status:e instanceof ContractError?e.code:'tool_boundary_failed',details:e instanceof ContractError?e.details:{},ok:false};}
  }
}
export async function runContractTurn({client,model='gpt-5.6-sol',reasoning='low',maxRounds=6,maxToolCalls=16,evaluation=null,...options}) {
  requireContract(client?.responses?.create,'injected_client_required');
  const runtime=new ContractRuntime(options),input=runtime.input(),seen=new Map();let failure=null,decision=null;
  for(let round=0;round<maxRounds;round++){
    let response;
    try{evaluation?.assertOpen();runtime.syncKnowledgeInput(input);assertOwnerContextInput(input,runtime.ownerContext);const request={model,reasoning:{effort:reasoning},text:{verbosity:'low'},input,tools:TOOLS,tool_choice:'auto',parallel_tool_calls:false,store:false,max_output_tokens:2400};assertPayloadSafe(request);response=await client.responses.create(request);}catch(e){failure=e instanceof ContractError?e.code:'model_transport_failed';break;}
    const output=response.output||[],calls=output.filter(o=>o.type==='function_call');
    const text=response.output_text||output.flatMap(o=>o.content||[]).filter(c=>c.type==='output_text').map(c=>c.text).join('\n');
    if(response.status&&response.status!=='completed'){failure='model_response_incomplete';break;}
    if(!calls.length){try{decision=acceptAnswer(runtime,text);evaluation?.observeDecision(decision);}catch(e){failure=e instanceof ContractError?e.code:'output_privacy_blocked';}break;}
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
