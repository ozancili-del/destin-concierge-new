import { tokens } from './artifact.js';

const STOP=new Set(tokens('the is are was were what which how do does can could would should will you your we our me my it its they their that this these those a an to from of for in on at and or please tell about recommend recommendations options places ones'));
const meaningful=value=>tokens(value).filter(t=>!STOP.has(t));
const score=(terms,value)=>{const hay=new Set(tokens(value));return terms.reduce((n,t)=>n+(hay.has(t)?1:0),0);};
export function searchArtifact(artifact, request, context={}, {now=new Date(),revokedFactIds=new Set()}={}) {
  const day=new Date(now).toISOString().slice(0,10);
  const eligible=f=>(!f.validFrom||f.validFrom<=day)&&(!f.validUntil||f.validUntil>=day)&&!revokedFactIds.has(f.id);
  const facts=new Map(artifact.entries.flatMap(e=>e.facts.filter(eligible).map(f=>[f.id,f])));
  const category=request.category || (request.followup==='more'||request.followup==='refine'?context.category:null);
  const explicitIds=request.entityIds || [];
  const queryTerms=meaningful([request.query,...(request.fields||[])].join(' '));
  const offered=new Set(request.followup==='more'&&category===context.category?context.offeredEntityIds||[]:[]);
  const recommendations=request.intent==='recommendations';
  const count=recommendations?request.requestedCount||3:null;
  let candidates=artifact.entries.filter(e=>e.facts.some(eligible));
  if(explicitIds.length)candidates=candidates.filter(e=>explicitIds.includes(e.id));
  else if(category)candidates=candidates.filter(e=>e.categories.includes(category));
  else {
    const matches=new Set(queryTerms.flatMap(t=>artifact.index[t]||[]));
    candidates=candidates.filter(e=>matches.has(e.id));
  }
  const exhausted=candidates.length>0&&candidates.every(e=>offered.has(e.id));
  candidates=candidates.filter(e=>!offered.has(e.id));
  candidates=candidates.map(e=>({e,rank:e.rankings[category]||Number.MAX_SAFE_INTEGER,score:score(queryTerms,[e.name,...e.aliases,...e.tags].join(' '))*4+score(queryTerms,e.facts.filter(eligible).map(f=>f.claim).join(' '))}));
  candidates.sort((a,b)=>(recommendations?a.rank-b.rank:0)||b.score-a.score||a.e.id.localeCompare(b.e.id,'en'));
  const selected=candidates.slice(0,recommendations?count:explicitIds.length||2).map(({e})=>{
    const projection=artifact.projections.find(p=>p.id===e.id);
    const basisEligible=projection?.basis.every(b=>facts.has(b.factId));
    // Never fall back to the old aggregate when a canonical basis is revoked.
    let pool=e.id==='transport_airports'?basisEligible?projection.parts.map(p=>facts.get(p.factId)):[]:e.facts.filter(eligible);
    const ordered=pool.map(f=>({f,score:score(queryTerms,`${f.claim} ${f.id}`)})).sort((a,b)=>b.score-a.score||a.f.id.localeCompare(b.f.id,'en'));
    const picked=e.id==='transport_airports'?pool:ordered.slice(0,recommendations?1:4).map(x=>x.f);
    return {id:e.id,name:e.name,topicId:e.topicId,facts:picked};
  }).filter(e=>e.facts.length);
  return {status:selected.length?(recommendations&&selected.length<count?'partial':'complete'):'unavailable',candidates:selected,category:category||null,requestedCount:count,exhausted,factIds:[...new Set(selected.flatMap(e=>e.facts.map(f=>f.id)))],unresolved:selected.length?(recommendations&&selected.length<count?['recommendation_coverage']:[]):[exhausted?'category_exhausted':'knowledge_match']};
}

export function renderKnowledge(result,{channel='chat',holiday=false}={}) {
  const lines=result.candidates.map(e=>{
    // Bounded by complete facts, not arbitrary character slicing that can remove
    // a caveat or turn a negated statement into a positive one.
    const facts=channel==='voice'&&result.requestedCount?e.facts.slice(0,1):e.facts;
    return `${result.requestedCount?e.name+': ':''}${facts.map(f=>[f.claim,...f.qualifiers.filter(q=>!f.claim.includes(q))].join(' ')).join(' ')}`;
  });
  const caveats=holiday?['These are normal hours; holiday hours may differ. Please confirm directly with the business.']:[];
  if(result.status==='unavailable')lines.push(result.exhausted?'Those are all the approved options in that category.':'I don’t have a reliable approved answer for that detail.');
  return {text:[...lines,...caveats].join(channel==='chat'?'\n\n':' '),caveats,links:[],factIds:result.factIds};
}
