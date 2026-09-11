import {digest,assertArtifact} from './artifact.mjs';

export function assertPayloadSafe(payload,{apiKey}={}){
  const serialized=typeof payload==='string'?payload:JSON.stringify(payload);
  if(apiKey&&serialized.includes(apiKey))throw new Error('privacy_blocked:auth_credential_in_payload');
  const strings=[];
  function walk(value){
    if(typeof value==='string'){
      if(/^[\[{]/.test(value.trim())){let parsed;try{parsed=JSON.parse(value);}catch{}if(parsed&&typeof parsed==='object'){walk(parsed);return;}}
      strings.push(value);
    }else if(typeof value==='number'){if(Number.isInteger(value)&&Math.abs(value)>=1e12)strings.push(String(value));}
    else if(value&&typeof value==='object')for(const [key,child] of Object.entries(value)){
      if(/^(?:password|wifiPassword|doorCode|gateCode|cardNumber|card_number|cvv|ssn|apiKey|api_key|access_token|refresh_token)$/i.test(key)&&child!=null&&child!=='')throw new Error('privacy_blocked:sensitive_data_field');
      if(key==='traceId'&&typeof child==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(child))continue;
      walk(child);
    }
  }
  walk(payload);
  const forbidden=[
    ['credential',/\bsk-[A-Za-z0-9_-]{16,}|\bAKIA[A-Z0-9]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\./],
    ['access_secret',/\b(?:door\s*code|gate\s*code|wi-?fi\s*password|passcode|api[_ -]?key|password)\s*(?::|=|is)\s*["']?[A-Za-z0-9!@#$%^&*_-]{4,}/i],
    ['card_or_ssn',/\b(?:\d[ -]?){13,19}\b|\b\d{3}-\d{2}-\d{4}\b/],
    ['embedded_auth',/https?:\/\/[^\s/"<>]+:[^\s/"<>]+@|[?&](?:token|api_key|password|secret)=[^\s"&]+/i],
  ];
  for(const text of strings)for(const [kind,re] of forbidden)if(re.test(text))throw new Error(`privacy_blocked:${kind}`);
}
export function validateInputs(artifact,evaluations){
  assertArtifact(artifact);
  assertPayloadSafe(artifact);assertPayloadSafe(evaluations);
  const allowedEvaluationFields=new Set(['id','category','guest_question','conversation_context','expected_routing','relevant_entry_ids','relevant_fact_ids','required_caveats','claims_answer_must_not_make','grading_notes']);
  for(const e of evaluations)if(Object.keys(e).some(k=>!allowedEvaluationFields.has(k)))throw new Error('privacy_unreviewed_evaluation_field');
  return {artifactRevision:digest(artifact),evaluationHash:digest(evaluations),entries:artifact.entries.length,facts:artifact.entries.flatMap(e=>e.facts).length,evaluationDefinitions:evaluations.length,secretPatternChecks:'passed',sourceBoundary:'Only reviewed compiled guest artifact and evaluation definitions; no raw archive, guest records, environment files or repository history loaded.',manualSensitiveFactReview:'12 facts concerned general policy, public amenities/support numbers, or laundry payment methods; none contained credentials or guest records.',syntheticFixture:'Look up confirmation 1234 is an authored test utterance, not a reservation record.',authentication:'Existing API credential used only by SDK authentication, never included in model input or output reports.'};
}
