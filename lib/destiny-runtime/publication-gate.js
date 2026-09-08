import { digest, assertArtifact } from './artifact.js';
import { signReceipt } from './local-store.js';

const ROUTES={answer_from_knowledge:['knowledge'],refer_to_owner_or_responsible_source:['refer','denied'],ask_clarifying_question:['clarify','consent','check_availability'],perform_live_check:['check_availability','get_destin_weather','get_beach_conditions','search_current_events','get_beach_deals','consent'],emergency_services:['emergency']};
export function evaluationCases(evaluations){
  return evaluations.flatMap(e=>[e.guest_question,...(e.conversation_context?.alternate_phrasings||[])].filter(Boolean).map((question,index)=>({id:`${e.id}:${index}`,evaluationId:e.id,question,context:e.conversation_context,expectedRouting:e.expected_routing,entryIds:e.relevant_entry_ids,factIds:e.relevant_fact_ids,caveats:e.required_caveats,forbidden:e.claims_answer_must_not_make,gradingNotes:e.grading_notes})));
}
export async function runPublicationGate({artifact,evaluations,runCase,gradeAnswer,signingKey,kind='semantic_live',structuralPassed=false,runtimeFingerprint=null,concurrency=1,onProgress}){
  const revision=digest(artifact);assertArtifact(artifact,revision);
  const cases=evaluationCases(evaluations),results=[];
  if(!cases.length||new Set(cases.map(c=>c.id)).size!==cases.length)throw new Error('gate_invalid_suite');
  let cursor=0;
  async function worker(){while(cursor<cases.length){
    const caseIndex=cursor++,fixture=cases[caseIndex];
    const errors=[];let chat,voice;
    try{
      // Expected routes/facts/caveats are NOT passed to the interpreter. Each
      // channel receives only question and genuine conversation context.
      chat=await runCase({question:fixture.question,context:fixture.context,channel:'chat',revision});
      voice=await runCase({question:fixture.question,context:fixture.context,channel:'voice',revision});
      for(const [channel,r] of [['chat',chat],['voice',voice]]){
        if(r.revision!==revision)errors.push(`${channel}:revision_mismatch`);
        if(kind==='semantic_live'&&(r.interpretation?.kind!=='semantic_live'||!r.interpretation?.responseId))errors.push(`${channel}:semantic_execution_unproven`);
        if(r.trace?.githubReads!==0||r.trace?.fullAgentCalls!==0)errors.push(`${channel}:forbidden_nested_route`);
        const routes=r.outcomes.map(o=>o.executedRoute);
        if(!(ROUTES[fixture.expectedRouting?.primary]||[]).some(x=>routes.includes(x)))errors.push(`${channel}:route_mismatch`);
        const ids=new Set(r.outcomes.flatMap(o=>o.candidateIds||[])),facts=new Set(r.outcomes.flatMap(o=>o.factIds||[]));
        if(fixture.expectedRouting?.primary==='answer_from_knowledge'){
          if(fixture.entryIds?.length&&!fixture.entryIds.some(id=>ids.has(id)))errors.push(`${channel}:required_entity_missing`);
          if(fixture.factIds?.length&&!fixture.factIds.some(id=>facts.has(id)))errors.push(`${channel}:required_fact_missing`);
        }
        if(typeof gradeAnswer!=='function')errors.push(`${channel}:semantic_caveat_scope_grading_missing`);
        else{
          const grade=await gradeAnswer({fixture,result:r,channel});
          if(grade?.passed!==true||!grade.coverageChecked||!grade.caveatsChecked||!grade.forbiddenClaimsChecked)errors.push(`${channel}:answer_assertions_failed`);
          if(kind==='semantic_live'&&(grade?.evidence?.kind!=='semantic_live'||!grade.evidence.responseId))errors.push(`${channel}:semantic_grading_unproven`);
          r.gateGrade=grade;
        }
      }
      const core=r=>r.outcomes.map(o=>({intent:o.intent,route:o.executedRoute,status:o.status,candidateIds:o.candidateIds,factIds:o.factIds,unresolved:o.unresolved}));
      if(digest(core(chat))!==digest(core(voice)))errors.push('channel_domain_parity_failed');
    }catch(error){errors.push(String(error.message||error).slice(0,200));}
    results[caseIndex]={id:fixture.id,passed:errors.length===0,errors,chat:chat||null,voice:voice||null};
    if(onProgress)await onProgress({completed:results.filter(Boolean).length,total:cases.length,result:results[caseIndex]});
  }}
  await Promise.all(Array.from({length:Math.min(4,Math.max(1,concurrency))},()=>worker()));
  const failed=results.filter(r=>!r.passed).length;
  const executed=results.filter(r=>r.chat&&r.voice).length;
  const receipt={version:1,revision,kind,runtimeFingerprint,status:failed||!structuralPassed||(kind==='semantic_live'&&!/^[a-f0-9]{64}$/.test(runtimeFingerprint||''))?'failed':'passed',expected:cases.length,attempted:results.length,executed,failed,suiteHash:digest(cases),resultHash:digest(results),compilerPassed:true,structuralPassed,parityPassed:executed===cases.length&&!results.some(r=>r.errors.includes('channel_domain_parity_failed'))};
  return {receipt,results,signedReceipt:receipt.status==='passed'?signReceipt(receipt,signingKey):null};
}
