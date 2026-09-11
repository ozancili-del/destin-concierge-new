import {tokens,digest} from './artifact.js';

const grammar=new Set(tokens('a an the and or but for with from to of in on at is are was were be been being has have had it its they their them this that these those you your we our can will would should may normally typically usually about around approximately roughly daily every each open opens closed closes opening closing hours am pm good option options choice choices here another also plus offers offer includes include features feature located find get use see visit check directly please available unavailable do does not no only as by than more less per now today tomorrow currently us I my me'));
const canonical=t=>t.toLowerCase().replace(/[‘’]/g,"'").replace(/\b(?:approximately|roughly|around)\b/g,'about').replace(/\b(?:normally|typically|usually)\b/g,'normal').replace(/\b(?:opens|opening)\b/g,'open').replace(/\b(?:closes|closing)\b/g,'close').replace(/\bminutes\b/g,'minute').replace(/\bhours\b/g,'hour');
const content=s=>tokens(canonical(s)).filter(t=>!grammar.has(t)).map(t=>t.length>4?t.replace(/s$/,''):t);
const numbers=s=>String(s).match(/\d+(?:[.:]\d+)?/g)||[];
const negative=s=>/\b(?:not|no|never|cannot|can't|unavailable|unknown|unverified)\b/i.test(s);

export function groundedSentence(draft,evidence){
 if(!evidence)return {ok:false,reason:'missing_evidence'};
 if(typeof draft!=='string'||!draft.trim()||/https?:\/\/|\b(?:evidence|publication|metadata|instructions|bookkeeping|on file|owner.review|stored facts)\b/i.test(draft))return {ok:false,reason:'internal_or_url_text'};
 if(evidence.kind!=='hq')return {ok:draft.trim()===evidence.text.trim(),reason:'typed_scope_requires_canonical_sentence'};
 const allowed=new Set(content(evidence.text+' '+(evidence.entity||''))),extra=content(draft).filter(t=>!allowed.has(t));
 if(extra.length)return {ok:false,reason:'unsupported_content',extra};
 const digits=numbers(draft),source=numbers(evidence.text);let cursor=0;
 for(const n of digits){const index=source.indexOf(n,cursor);if(index<0)return {ok:false,reason:'unbound_number'};cursor=index+1;}
 if(negative(draft)!==negative(evidence.text))return {ok:false,reason:'polarity_changed'};
 // A lexical check is deliberately conservative; it is not an entailment proof.
 return {ok:true,reason:'source_link_and_literal_checks'};
}

const clarify={entity:'Which place do you mean?',dates:'What check-in and check-out dates would you like?',date_boundary:'Do you want to change the arrival date, departure date, or both?',party:'How many adults and children are travelling?',origin:'Which city or airport will you fly from?'};
export function groundAnswer(answer={},evidence=[],links=[],{requiredEvidenceIds=[]}={}){
 const byId=new Map(evidence.map(e=>[e.id,e])),validLinks=new Map(links.map(l=>[l.id,l]));
 const sentences=[],violations=[],seen=new Set();
 for(const proposal of answer.sentences||[]){
  const e=byId.get(proposal.evidenceId);if(!e){violations.push({id:proposal.evidenceId,reason:'missing_evidence'});continue;}if(seen.has(e.id))continue;seen.add(e.id);
  const chat=groundedSentence(proposal.chat,e),voice=groundedSentence(proposal.voice,e);
  // Keep factual content channel-neutral. Distinct wording must independently
  // pass the same binding; failed wording uses the source's guest-safe sentence.
  if(!chat.ok||!voice.ok)violations.push({id:e.id,chat,voice});
  sentences.push({evidenceId:e.id,entityId:e.entityId||null,chat:chat.ok?proposal.chat:e.text,voice:voice.ok?proposal.voice:e.text,sourceHash:e.sourceHash,grounding:chat.ok&&voice.ok?'checked':'source_substitution'});
 }
 for(const id of requiredEvidenceIds)if(!seen.has(id)&&byId.has(id)){const e=byId.get(id);sentences.push({evidenceId:id,entityId:e.entityId||null,chat:e.text,voice:e.text,sourceHash:e.sourceHash,grounding:'required_action_result'});seen.add(id);}
 const selectedLinks=[...new Set(answer.linkIds||[])].filter(id=>validLinks.has(id)).map(id=>validLinks.get(id));
 // An action's successful link is a completed result, not optional prose.
 for(const l of links)if(l.required&&!selectedLinks.some(x=>x.id===l.id))selectedLinks.push(l);
 const hasActionQuestion=sentences.some(s=>byId.get(s.evidenceId)?.kind==='clarification');
 const suffix=hasActionQuestion?null:answer.clarification?clarify[answer.clarification]:answer.unknown||!sentences.length?'I don’t have verified information for that.':null;
 return {sentences,links:selectedLinks,clarification:answer.clarification||null,suffix,violations,claimIds:sentences.map(s=>s.evidenceId),decisionHash:digest({sentences:sentences.map(s=>({id:s.evidenceId,sourceHash:s.sourceHash})),links:selectedLinks.map(l=>l.url),suffix})};
}

export function presentAnswer(answer,channel){
 const text=answer.sentences.map(s=>s[channel]).join(channel==='chat'?'\n\n':' ')+(answer.suffix?`${answer.sentences.length?'\n\n':''}${answer.suffix}`:'');
 if(channel==='chat')return {text:text+(answer.links.length?'\n\n'+answer.links.map(l=>`${l.label}: ${l.url}`).join('\n'):''),links:answer.links,policy:'concise_written_v1'};
 return {text:text.replace(/\s+/g,' ').trim()+(answer.links.length?' The links are available on your screen.':''),links:answer.links,policy:'speakable_v1',speech:{readUrls:false,interruptible:true,wordCount:text.split(/\s+/).length},physicalTested:false};
}
