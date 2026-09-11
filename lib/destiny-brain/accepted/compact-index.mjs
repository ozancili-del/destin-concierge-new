import metadata from './index-metadata.json' with {type:'json'};
import {hash,requireContract} from './kernel.mjs';
// Versioned discovery subjects, never question-dependent and never fact evidence.
export function compileCompactIndex(compiled,projection=metadata){
 requireContract(projection.schemaVersion===1&&projection.artifactRevision===compiled.revision&&projection.sourceRevision===compiled.sourceRevision,'index_metadata_revision_mismatch');
 const entries=projection.entries;
 requireContract(Array.isArray(entries)&&entries.length===compiled.packages.length&&new Set(entries.map(e=>e.id)).size===entries.length,'index_metadata_incomplete');
 const byId=new Map(entries.map(e=>[e.id,e])),pricing=new Map(compiled.conditionalPackages.map(p=>[p.id,p])),booking=new Map(compiled.bookingPackages.map(p=>[p.id,p]));
 const index=compiled.packages.map(p=>{
  const e=byId.get(p.id),pp=pricing.get(p.id)??null,bp=booking.get(p.id)??null;
  requireContract(e&&e.sourceHash===hash({general:p,pricing:pp,booking:bp}),'index_metadata_stale',{id:p.id});
  requireContract(typeof e.coverage==='string'&&e.coverage.trim().length>0&&e.coverage.length<=600&&Array.isArray(e.aliases)&&e.aliases.length>0&&e.aliases.every(a=>typeof a==='string'&&a.trim()),'index_metadata_invalid',{id:p.id});
  return {id:p.id,topic:p.topic,name:e.displayName??p.name,aliases:[...new Set([...p.aliases,...e.aliases])],coverage:e.coverage,availableContexts:{general:p.facts.length>0,pricing:!!pp?.facts.length,booking:!!bp?.facts.length}};
 });
 return {schemaVersion:1,metadataRevision:hash(projection),hqRevision:compiled.revision,index};
}
