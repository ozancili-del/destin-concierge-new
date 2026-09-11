import {tokens,digest} from './artifact.js';

const ignored=new Set(tokens('the a an is are what where when how can do does please me my our your for of to at in and with it its normal regular tell recommend options places'));
const terms=s=>tokens(s).filter(t=>!ignored.has(t));
const normalized=s=>tokens(s).join('_');
export function normalizeCategory(value,artifact){
  if(typeof value!=='string'||!value.trim())return null;
  const categories=[...new Set(artifact.entries.flatMap(e=>e.categories))];
  const exact=categories.find(c=>normalized(c)===normalized(value));
  return exact||null; // Unknown/ambiguous wording is a missing hint, never an exception.
}
const score=(q,s)=>{const set=new Set(tokens(s));return q.reduce((n,t)=>n+(set.has(t)?1:0),0);};
export function retrieveContext(artifact,args={},context={}, {now=new Date(),revokedFactIds=new Set()}={}){
  const start=performance.now(),day=new Date(now).toISOString().slice(0,10);
  const eligible=f=>(!f.validFrom||f.validFrom<=day)&&(!f.validUntil||f.validUntil>=day)&&!revokedFactIds.has(f.id);
  const allFacts=new Map(artifact.entries.flatMap(e=>e.facts.filter(eligible).map(f=>[f.id,f])));
  const mode=['facts','recommendations','more','refine','change'].includes(args.mode)?args.mode:'facts';
  const isList=mode!=='facts';
  const category=normalizeCategory(args.category,artifact)||(['more','refine'].includes(mode)?context.category:null);
  const count=Math.min(6,Math.max(1,Number.isInteger(args.count)?args.count:3));
  const explicit=new Set((args.entityIds||[]).filter(id=>artifact.entries.some(e=>e.id===id)));
  const q=terms([args.query,...(args.fields||[])].join(' '));
  const excluded=new Set(['more','recommendations'].includes(mode)&&category===context.category?context.offeredEntityIds||[]:[]);
  let entries=artifact.entries.filter(e=>e.facts.some(eligible)&&!excluded.has(e.id));
  if(explicit.size)entries=entries.filter(e=>explicit.has(e.id)&&(!category||!isList||e.categories.includes(category)));
  else if(category&&isList)entries=entries.filter(e=>e.categories.includes(category));
  else if(explicit.size)entries=entries.filter(e=>explicit.has(e.id));
  else if(category)entries=entries.filter(e=>e.categories.includes(category));
  else{const matches=new Set(q.flatMap(t=>artifact.index[t]||[]));entries=entries.filter(e=>matches.has(e.id));}
  const ranked=entries.map(e=>({e,rank:category?e.rankings[category]||1e6:1e6,score:score(q,[e.name,...e.aliases,...e.tags].join(' '))*5+score(q,e.facts.filter(eligible).map(f=>f.claim).join(' '))}));
  ranked.sort((a,b)=>(isList?a.rank-b.rank:0)||b.score-a.score||a.e.id.localeCompare(b.e.id));
  const selected=ranked.slice(0,isList?count:Math.max(1,Math.min(4,explicit.size||2))).map(({e,rank})=>{
    const projection=artifact.projections.find(p=>p.id===e.id&&p.entityIds.some(id=>id!==e.id));
    const all=e.facts.filter(eligible);
    const basis=projection?.basis.every(b=>allFacts.has(b.factId)&&digest(allFacts.get(b.factId))===b.hash);
    if(projection&&!basis)return null;
    // Exact branch identity and safeguards are context; fact choice remains query-specific.
    const sorted=all.map(f=>({f,score:score(q,f.claim+' '+f.id)*3+(/identity|address|contact|scope|limit|guarantee|boundary/.test(f.id)?1:0)})).sort((a,b)=>b.score-a.score||a.f.id.localeCompare(b.f.id));
    const picked=projection?projection.parts.map(p=>allFacts.get(p.factId)):sorted.slice(0,isList?5:9).map(x=>x.f);
    return {id:e.id,name:e.name,rank:Number.isFinite(rank)&&rank<1e6?rank:null,facts:picked.map(f=>({id:f.id,claim:f.claim,constraints:f.qualifiers}))};
  }).filter(Boolean);
  return {revision:digest(artifact),query:args.query||'',category,mode,requestedCount:isList?count:null,status:selected.length?'success':'no_match',entries:selected,excludedIds:[...excluded],factIds:selected.flatMap(e=>e.facts.map(f=>f.id)),elapsedMs:performance.now()-start};
}

export function knowledgeTool(artifact){return {type:'function',name:'get_business_knowledge',description:'Retrieve query-specific HQ-approved evidence. Use before factual answers about places, units, policies or recommendations. Resolve named branches/pronouns from conversation; more excludes prior recommendations. Unknown category: null. Facts are evidence to compose from, never text to recite.',strict:true,parameters:{type:'object',additionalProperties:false,properties:{query:{type:'string'},entityIds:{type:'array',items:{type:'string',enum:artifact.entries.map(e=>e.id)}},category:{type:['string','null'],enum:[...new Set(artifact.entries.flatMap(e=>e.categories)),null]},mode:{type:'string',enum:['facts','recommendations','more','refine','change']},count:{type:'integer',minimum:1,maximum:6},fields:{type:'array',items:{type:'string'}}},required:['query','entityIds','category','mode','count','fields']}};}

// Canonical legacy tool topics, not guest-phrase routing.
export const GUIDE_CATEGORIES=Object.freeze({restaurants:'restaurant',restaurants2:'restaurant',supermarkets:'closest_practical_grocery',essentials:'arrival_day_essentials',airport:'airports',spa:'spas',beaches:'beaches',activities:'activities',kids:'families',romance:'couples-activities'});
