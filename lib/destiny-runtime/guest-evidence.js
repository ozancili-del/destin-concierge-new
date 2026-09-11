import {digest,tokens} from './artifact.js';
import {todayIso} from '../destiny-agent/business.js';

const cache=new WeakMap();
const control=/\b(?:instructions? to destiny|destiny (?:may|should|must)|owner.review|owner.only|publication|editorial|fact[_ -]?ids?|stored facts|stored contact|on file|metadata|basis|source registry|approved HQ|approved (?:stored|normal|facts|knowledge)|do not (?:trigger|run|search|expose)|use (?:the |these |only |precise |approved |stored )|refer (?:exact|current|individual)|treat .* as|should be (?:used|confirmed)|indirect contact values|live.check triggers|Public contact and official location route|must not be transferred|checklist|highest.rated)\b/i;
const instructionStart=/^(?:Use|Do not|Never|Always|Tell|Ask|Refer|Confirm|Avoid|Treat|Include|Exclude|Keep|Prefer|Return|Explain|Preserve|Select|Answer)\b/;
const ignored=new Set(tokens('the a an and or is are was were be what where when which how can could would should please tell give me us my our your it its they their that those other more ones any some normal regular nearby recommend recommendations options places of in to for from with at on about'));
const stem=t=>t.length>4?t.replace(/(?:ies|s)$/,''):t;
const terms=s=>{const all=tokens(s).filter(t=>!ignored.has(t)).map(stem),subject=all.filter(t=>!['pelican','beach','resort','destin'].includes(t));return subject.length?subject:all;};
const score=(query,text)=>{const set=new Set(terms(text));return query.reduce((n,t)=>n+(set.has(t)?1:0),0);};

export function guestSentences(text){
 return String(text||'').split(/(?<=[.!?])\s+(?=[A-Z])|\n+/).map(s=>s.trim()
  .replace(/The stored normal hours for /g,'Normal hours for ').replace(/The stored telephone number for /g,'The telephone number for ').replace(/is described in the approved restaurant profile as /g,'serves ').replace(/The owner[’']s planning estimate is /g,'The estimated drive time is ').replace(/is now identified by the owner as /g,'is now ').replace(/The approved airport guide is /g,'The airport guide is '))
  .filter(s=>s&&!control.test(s)&&!instructionStart.test(s)&&!/\b(?:stored|approved|editorial|publication)\b|(?:password|door code|access code)\s*[:=]/i.test(s));
}

function compiled(artifact){
 if(cache.has(artifact))return cache.get(artifact);
 const entries=artifact.entries.map(e=>({id:e.id,name:e.name,aliases:e.aliases,categories:e.categories,rankings:e.rankings,
   localTerms:[e.name,...e.aliases,...e.tags,...e.questions,...e.categories].join(' '),
   atoms:e.facts.flatMap(f=>guestSentences(f.claim).map((text,index)=>({id:`${f.id}#${index}`,factId:f.id,entityId:e.id,entity:e.name,text,kind:'hq',status:'verified',validFrom:f.validFrom,validUntil:f.validUntil,sourceHash:digest(f)})))
 })).filter(e=>e.atoms.length);
 const result={revision:digest(artifact),entries};cache.set(artifact,result);return result;
}

export function speculativeEvidence(artifact,text,history=[],session={}, {now=new Date(),revokedFactIds=new Set(),maxChars=9500}={}){
 const start=performance.now(),data=compiled(artifact),day=todayIso(new Date(now));
 const latest=terms(text),previous=terms(history.filter(m=>m.role==='user').slice(-2).map(m=>m.content).join(' '));
 const clean=s=>tokens(s).join(' '),message=clean(text);
 const explicit=data.entries.filter(e=>e.id!=='resort_identity'&&[e.name,...e.aliases].some(n=>{const phrase=clean(n).replace(/^destin /,'');return phrase.length>=6&&message.includes(phrase);}));
 const named=new Set(explicit.map(e=>e.id));
 const candidates=data.entries.map(e=>{
  const atoms=e.atoms.filter(a=>(!a.validFrom||a.validFrom<=day)&&(!a.validUntil||a.validUntil>=day)&&!revokedFactIds.has(a.factId));
  const current=score(latest,e.localTerms)*5+score(latest,e.categories.join(' '))*20+score(latest,atoms.map(a=>a.text).join(' '));
  const context=score(previous,e.localTerms)*2+score(previous,e.categories.join(' '))*20+score(previous,atoms.map(a=>a.text).join(' '))*.2;
  const wasOffered=(session.offeredEntityIds||[]).includes(e.id);
  return {...e,atoms,wasOffered,score:(named.has(e.id)?1000:0)+current+(latest.length<3?context:context*.12)};
 }).filter(e=>e.atoms.length&&e.score>0);
 candidates.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
 // Relevance comes first. Keep prior choices marked and retrieve additional
 // choices too; the model interprets whether this is refinement or 'more'.
 const relevant=candidates.filter(e=>e.score>=(candidates[0]?.score||0)*.4);
 const selected=explicit.length?candidates.filter(e=>named.has(e.id)).slice(0,4):[...relevant.filter(e=>!e.wasOffered).slice(0,5),...relevant.filter(e=>e.wasOffered).slice(0,2)];
 const evidence=[];let size=0;
 for(const e of selected){
  const q=latest.length?latest:previous;
  const atoms=[...e.atoms].sort((a,b)=>score(q,b.text)-score(q,a.text)||a.id.localeCompare(b.id)).slice(0,explicit.length?8:4);
  for(const a of atoms){const item={id:a.id,factId:a.factId,entityId:a.entityId,entity:a.entity,text:a.text,kind:a.kind,status:a.status,sourceHash:a.sourceHash,alreadyOffered:e.wasOffered};const n=JSON.stringify(item).length;if(size+n>maxChars)continue;evidence.push(item);size+=n;}
 }
 return {revision:data.revision,evidence,trace:{elapsedMs:performance.now()-start,bytes:size,entityIds:[...new Set(evidence.map(e=>e.entityId))],factIds:[...new Set(evidence.map(e=>e.factId))],eligibleCandidates:candidates.length}};
}

export function fieldEvidence(id,field,status,value,text,{source=null,checkedAt=null,kind='live',entityId=null}={}){
 if(!['verified','not_checked','unknown','unavailable'].includes(status))throw new Error('invalid_evidence_status');
 return {id,field,status,value,text,source,checkedAt,kind,entityId,sourceHash:digest({field,status,value,source,checkedAt})};
}
