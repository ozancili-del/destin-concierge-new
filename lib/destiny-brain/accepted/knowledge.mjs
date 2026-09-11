import {requireContract} from './kernel.mjs';
import {compilePublicKnowledge} from './public-knowledge.mjs';
// Caller supplies the existing published/approved compiled artifact; no source fetches.
export function knowledgeStore(artifact,compiled=compilePublicKnowledge(artifact)) {
  const byId=new Map(compiled.packages.map(p=>[p.id,p]));
  const index=compiled.discovery.index;
  const catalog=[...new Set(index.map(p=>p.topic))].map(topic=>({topic,entities:index.filter(p=>p.topic===topic).length}));
  const recovery={catalog,index,guidance:'Select exact package IDs from the complete index and load relevant packages. Unknown or empty retrieval supplies no facts; it does not mean the real-world service is absent.'};
  return {index,
    inspect(ids,context='general'){
      const missing=ids.filter(id=>!byId.has(id));
      if(missing.length)return {status:'unknown',knowledgeState:'unknown',context,missing,packages:[],...structuredClone(recovery)};
      const empty=ids.filter(id=>!index.find(p=>p.id===id).availableContexts[context]);
      if(!ids.length||empty.length)return {status:'verified_empty',knowledgeState:'verified_empty',context,empty,packages:[],...structuredClone(recovery)};
      return {status:'success',knowledgeState:'data',context};
    },
    packages(ids){const missing=ids.filter(id=>!byId.has(id));requireContract(!missing.length,'unknown_hq_entity',{missing});return ids.map(id=>structuredClone(byId.get(id)));},
    browse(topics){
      const missing=topics.filter(topic=>!catalog.some(c=>c.topic===topic));
      if(missing.length)return {status:'unknown',knowledgeState:'unknown',missing,directory:[],...structuredClone(recovery)};
      return {status:'success',knowledgeState:'data',directory:structuredClone(topics.length?topics.map(topic=>({topic,index:index.filter(e=>e.topic===topic)})):catalog)};
    }};
}
