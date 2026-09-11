import {hash,requireContract,projectState} from './kernel.mjs';
import {assertPayloadSafe} from './vendor/privacy.mjs';
import {canonicalUrl,filterOutputLinks,urlOccurrences} from './links.mjs';

export function trustedLinks(runtime) {
  const current=[...runtime.state.results,...runtime.engine.evidence.values()].filter(r=>r.kind!=='knowledge'&&r.kind!=='calendar'&&r.revision===runtime.state.revision);
  const latest=[...new Map(current.map(r=>[r.kind+':'+r.outcomeId,r])).values()];
  const eligible=latest.filter(r=>r.status==='success'||r.status==='partial'||r.kind==='availability'&&r.status==='refresh_failed'&&r.data.linkReusable);
  const links=[...runtime.knowledgeScope.links(),...eligible.flatMap(r=>r.links||[])];
  return [...new Map(links.map(l=>[canonicalUrl(l.url),l])).values()];
}
// Narrow URL and secrets boundary only. No factual/prose matching or rewrite.
export function checkOutputBoundary(text,links) {
  requireContract(typeof text==='string'&&text.trim().length>0&&text.length<=16000,'invalid_final_text');
  assertPayloadSafe({text});
  return filterOutputLinks(text,links);
}
export function acceptAnswer(runtime,text) {
  const authority=trustedLinks(runtime),checked=checkOutputBoundary(text,authority);
  const mentioned=new Set(urlOccurrences(checked.text,{knownUrls:authority.map(l=>canonicalUrl(l.url))}).map(s=>canonicalUrl(s.target,{markup:s.kind!=='bare'})));
  const currentActionUrls=new Set([...runtime.engine.evidence.values()].flatMap(r=>(r.links||[]).map(l=>l.url)));
  const links=authority.filter(l=>mentioned.has(canonicalUrl(l.url))||l.source==='trusted_tool'&&currentActionUrls.has(l.url));
  const domain=[...new Set([...runtime.outcomes.map(o=>o.kind),...(runtime.loadedPackages.length?['knowledge']:[])])];
  const decision={text:checked.text,links,domain:domain.length?domain:['conversation'],revision:runtime.state.revision,state:projectState(runtime.state),requestedOutcomes:runtime.outcomes,status:checked.warnings.length?'answered_with_link_withheld':'answered',linkWarnings:checked.warnings};
  decision.hash=hash(decision);return decision;
}
export function present(decision,channel) {
  requireContract(['chat','voice'].includes(channel),'unknown_channel');
  return {channel,text:decision.text,links:decision.links.map(({url,unit,label})=>({url,...(unit?{unit}:{}),...(label?{label}: {})})),domain:decision.domain,revision:decision.revision,state:structuredClone(decision.state),decisionHash:decision.hash,status:decision.status};
}
