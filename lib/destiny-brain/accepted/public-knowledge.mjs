import {hash,requireContract} from './kernel.mjs';
import {compileCompactIndex} from './compact-index.mjs';
import {canonicalUrl,urlOccurrences} from './links.mjs';
import {assertPayloadSafe} from './vendor/privacy.mjs';
const freeze=o=>{if(o&&typeof o==='object'){for(const v of Object.values(o))freeze(v);Object.freeze(o);}return o;};
const compiledCache=new WeakMap();
const modes=new Set(['normal','only_if_asked','internal_only']);
// Guest text is a deliberate HQ projection. Raw source values and arbitrary
// nested keys can contain research or review data and are never model input.
const textFields=(v,path='value')=>typeof v==='string'?[[path,v]]:v&&typeof v==='object'?Object.entries(v).flatMap(([k,x])=>textFields(x,path+'.'+k)):[];
import {COMPOSITION_GUIDANCE} from './composition-guidance.mjs';
export {COMPOSITION_GUIDANCE};
// Only declared public fields enter this projection. Never recursively mine
// notes, provenance, editorial instructions or unrelated source URLs.
export function compileGuestProjection(artifact) {
  requireContract(Array.isArray(artifact?.packages),'invalid_hq_packages');
  requireContract(artifact.exposureSchemaVersion===2,'exposure_schema_required');
  const revision=hash(artifact),cached=compiledCache.get(artifact),seen=new Set();
  if(cached?.revision===revision)return cached;
  const project=(mode,context=null)=>artifact.packages.map(p=>{
    requireContract(typeof p.id==='string'&&!seen.has(p.id),'duplicate_hq_package');seen.add(p.id);
    requireContract(typeof p.name==='string'&&typeof p.topic==='string'&&Array.isArray(p.facts),'invalid_hq_package');
    requireContract([p.name,...(p.aliases??[])].every(s=>typeof s==='string'&&urlOccurrences(s).length===0),'orphan_hq_link');
    const factIds=new Set(),links=[],sourceIds=new Set();
    for(const f of p.facts){
      requireContract(typeof f.id==='string'&&!sourceIds.has(f.id),'invalid_hq_fact');sourceIds.add(f.id);
      requireContract(modes.has(f.exposure),'invalid_hq_exposure');
      const sourceFields=Object.fromEntries(Object.entries(f).filter(([k])=>!['guestText','exposure','projectionKind','retrievalContext','projectionReview'].includes(k)));
      requireContract(f.projectionReview?.version===1&&f.projectionReview.sourceHash===hash(sourceFields)&&f.projectionReview.projectionHash===hash({exposure:f.exposure,kind:f.projectionKind,context:f.retrievalContext,text:f.guestText??null}),'unreviewed_guest_projection');
      requireContract(['fact','price_summary','resort_charge','booking_term','control','research'].includes(f.projectionKind),'invalid_projection_kind');
      requireContract(!['control','research'].includes(f.projectionKind)||f.exposure==='internal_only','control_in_guest_projection');
      requireContract(f.exposure==='only_if_asked'?['pricing','booking'].includes(f.retrievalContext):f.retrievalContext===null,'invalid_retrieval_context');
      requireContract(f.projectionKind!=='booking_term'||f.exposure==='only_if_asked'&&f.retrievalContext==='booking','booking_context_required');
      requireContract(f.projectionKind!=='price_summary'||f.exposure==='only_if_asked'&&f.retrievalContext==='pricing','price_context_required');
      if(f.exposure!=='internal_only')requireContract(typeof f.guestText==='string'&&f.guestText.trim().length>0,'guest_projection_required');
    }
    const facts=p.facts.filter(f=>f.exposure===mode&&f.retrievalContext===context&&(!f.visibility||['public','guest'].includes(f.visibility))&&f.guestFacing!==false&&!['editorial','instruction','internal'].includes(f.kind)).map(f=>{
      requireContract(typeof f.id==='string'&&!factIds.has(f.id)&&(typeof f.text==='string'||f.value!=null),'invalid_hq_fact');factIds.add(f.id);
      const fact={id:f.id,text:f.guestText};
      for(const [field,text] of textFields(fact,'fact').filter(([field])=>field!=='fact.id'))for(const o of urlOccurrences(text)){
        const url=canonicalUrl(o.target,{markup:o.kind!=='bare'});links.push({id:hash({revision,packageId:p.id,factId:f.id,field,url}),url,entityId:p.entityId??p.id,packageId:p.id,factId:f.id,field,hqRevision:revision,type:url.startsWith('https:')?'web':'contact',purpose:'public_reference',source:'hq',original:o.target});
      }
      return fact;
    });
    for(const [n,l] of (p.publicLinks??[]).entries()){
      requireContract(sourceIds.has(l.factId)&&(!l.packageId||l.packageId===p.id)&&(!l.entityId||l.entityId===(p.entityId??p.id)),'orphan_hq_link');
      if(!factIds.has(l.factId))continue;
      const url=canonicalUrl(l.url),type=url.startsWith('https:')?'web':'contact';
      requireContract(!l.type||l.type===type,'invalid_hq_link_type');
      requireContract(!l.purpose||typeof l.purpose==='string'&&l.purpose.length<=80,'invalid_hq_link_purpose');
      if(!links.some(x=>x.factId===l.factId&&x.url===url))links.push({id:hash({revision,packageId:p.id,factId:l.factId,url}),url,entityId:p.entityId??p.id,packageId:p.id,factId:l.factId,field:'publicLinks.'+n,hqRevision:revision,type,purpose:l.purpose||'public_reference',source:'hq',original:l.url});
    }
    return {id:p.id,entityId:p.entityId??p.id,topic:p.topic,name:p.name,aliases:(p.aliases??[]).filter(a=>typeof a==='string'),facts,publicLinks:[...new Map(links.map(l=>[l.id,l])).values()],hqRevision:revision};
  });
  const packages=project('normal');seen.clear();
  const conditionalPackages=project('only_if_asked','pricing').filter(p=>p.facts.length);seen.clear();
  const bookingPackages=project('only_if_asked','booking').filter(p=>p.facts.length);
  const result={schemaVersion:3,revision,sourceRevision:artifact.sourceRevision,compositionGuidance:COMPOSITION_GUIDANCE,packages,conditionalPackages,bookingPackages};
  assertPayloadSafe(result);freeze(result);compiledCache.set(artifact,result);return result;
}
const discoveryCache=new WeakMap();
export function compilePublicKnowledge(artifact){
  const projected=compileGuestProjection(artifact);
  let result=discoveryCache.get(projected);
  if(!result){result=freeze({...projected,discovery:compileCompactIndex(projected)});discoveryCache.set(projected,result);}
  return result;
}
export function validatePublicKnowledge(compiled,artifact) {
  requireContract(hash(compiled)===hash(compilePublicKnowledge(artifact)),'public_knowledge_drift');return true;
}
export class KnowledgeScope {
  #compiled; #loaded=new Map(); #byId; #conditional; #booking;
  constructor(compiled){this.#compiled=freeze(structuredClone(compiled));this.#byId=new Map(this.#compiled.packages.map(p=>[p.id,p]));this.#conditional=new Map(this.#compiled.conditionalPackages.map(p=>[p.id,p]));this.#booking=new Map(this.#compiled.bookingPackages.map(p=>[p.id,p]));}
  hydrate(ids){
    const records=ids.map(id=>{const p=this.#byId.get(id);requireContract(p,'unknown_hq_entity');return p;});
    // Validate the complete batch before committing any member.
    for(const p of records)requireContract(p.hqRevision===this.#compiled.revision&&p.publicLinks.every(l=>l.packageId===p.id&&l.entityId===p.entityId&&l.hqRevision===p.hqRevision&&p.facts.some(f=>f.id===l.factId)),'package_authority_mismatch');
    for(const p of records)if(!this.#loaded.has(p.id))this.#loaded.set(p.id,p);
    return structuredClone(records);
  }
  hydratePricing(ids){return this.#hydrateConditional(ids,this.#conditional);}
  hydrateBooking(ids){return this.#hydrateConditional(ids,this.#booking);}
  #hydrateConditional(ids,collection){
    this.hydrate(ids);
    for(const id of ids){const extra=collection.get(id);if(!extra)continue;
      const base=this.#loaded.get(id);
      requireContract(extra.hqRevision===base.hqRevision&&extra.publicLinks.every(l=>l.packageId===id&&extra.facts.some(f=>f.id===l.factId)),'package_authority_mismatch');
      this.#loaded.set(id,{...base,facts:[...new Map([...base.facts,...extra.facts].map(f=>[f.id,f])).values()],publicLinks:[...new Map([...base.publicLinks,...extra.publicLinks].map(l=>[l.id,l])).values()]});
    }
    return this.packages().filter(p=>ids.includes(p.id));
  }
  packages(){return structuredClone([...this.#loaded.values()]);}
  links(){return this.packages().flatMap(p=>p.publicLinks);}
  snapshot(){return {revision:this.#compiled.revision,packages:this.packages()};}
  assertSnapshot(snapshot){requireContract(hash(snapshot)===hash(this.snapshot()),'model_context_authority_mismatch');}
  modelPackages(ids){return this.packages().filter(p=>!ids||ids.includes(p.id)).map(p=>({...p,publicLinks:p.publicLinks.map(({url,type,purpose})=>({url,type,purpose}))}));}
  modelSnapshot(){return {revision:this.#compiled.revision,packages:this.modelPackages()};}
  assertModelSnapshot(snapshot){requireContract(hash(snapshot)===hash(this.modelSnapshot()),'model_context_authority_mismatch');}
}
