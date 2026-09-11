import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import approval from './ACCEPTED-SOURCE.json' with {type:'json'};
import {hash,requireContract,stable} from './accepted/kernel.mjs';
import {validatePublicKnowledge} from './accepted/public-knowledge.mjs';
import {atomicWrite,withLock} from '../destiny-runtime/local-store.js';

export function validateEnvelope(envelope){
  requireContract(envelope?.schemaVersion===2,'private_envelope_schema');
  const {revision,...payload}=envelope;
  requireContract(revision===hash(payload)&&payload.hqRevision===hash(payload.artifact),'private_envelope_integrity');
  requireContract(revision===approval.envelopeRevision&&payload.hqRevision===approval.hqRevision&&payload.artifact.sourceRevision===approval.sourceRevision,'private_envelope_not_approved');
  validatePublicKnowledge(payload.publicKnowledge,payload.artifact);
  return envelope;
}
const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
export class PrivateEnvelopeStore {
  constructor(root,{environment=process.env.VERCEL_ENV}={}){
    if(environment||!path.isAbsolute(root||''))throw Error('private_durable_local_root_required');
    // A separate namespace, never the old publication or HQ pointer.
    this.root=path.join(root,'accepted-brain-v1');
  }
  objectPath(revision){if(!/^[a-f0-9]{64}$/.test(revision||''))throw Error('invalid_private_revision');return path.join(this.root,'objects',revision+'.json');}
  async put(envelope){
    validateEnvelope(envelope);await fs.mkdir(path.join(this.root,'objects'),{recursive:true});
    const target=this.objectPath(envelope.revision),temp=path.join(this.root,randomUUID()+'.upload');
    await atomicWrite(temp,stable(envelope));
    try{await fs.link(temp,target);}catch(e){if(e.code!=='EEXIST')throw e;await this.read(envelope.revision);}finally{await fs.unlink(temp);}
    return envelope.revision;
  }
  async read(revision){const envelope=validateEnvelope(JSON.parse(await fs.readFile(this.objectPath(revision),'utf8')));requireContract(envelope.revision===revision,'private_object_name_mismatch');return freeze(envelope);}
  async pointer(){try{
    const p=JSON.parse(await fs.readFile(path.join(this.root,'private-pointer.json'),'utf8'));
    requireContract(p.scope==='local-private-only'&&p.manifest===approval.manifest&&[null,approval.envelopeRevision].includes(p.revision)&&[null,approval.envelopeRevision].includes(p.previousRevision)&&Number.isInteger(p.generation)&&p.generation>=1&&Array.isArray(p.history)&&p.history.length===p.generation&&p.history.at(-1)?.revision===p.revision,'private_pointer_invalid');return p;
  }catch(e){if(e.code==='ENOENT')return null;throw e;}}
  async select(revision,{expectedGeneration=0}={}){
    if(revision!==null)await this.read(revision);
    await fs.mkdir(this.root,{recursive:true});
    return withLock(path.join(this.root,'select.lock'),async()=>{
      const old=await this.pointer();requireContract((old?.generation||0)===expectedGeneration,'private_pointer_conflict');
      const next={scope:'local-private-only',manifest:approval.manifest,revision,previousRevision:old?.revision??null,generation:expectedGeneration+1,history:[...(old?.history||[]),{revision,generation:expectedGeneration+1,at:new Date().toISOString()}]};
      await atomicWrite(path.join(this.root,'private-pointer.json'),stable(next));return next;
    });
  }
  async rollback({expectedGeneration}={}){const p=await this.pointer();requireContract(p&&p.generation===expectedGeneration,'private_pointer_conflict');return this.select(p.previousRevision,{expectedGeneration});}
}
export class PrivateEnvelopeReader {
  constructor(store){this.store=store;this.cache=new Map();this.inflight=new Map();this.revokedFactIds=new Set();}
  async pinned(revision){
    if(this.cache.has(revision))return {revision,artifact:this.cache.get(revision),cacheState:'hit'};
    if(!this.inflight.has(revision))this.inflight.set(revision,this.store.read(revision).then(e=>{this.cache.set(revision,e);return e;}).finally(()=>this.inflight.delete(revision)));
    return {revision,artifact:await this.inflight.get(revision),cacheState:'miss'};
  }
  async startSession(){const p=await this.store.pointer();requireContract(p?.scope==='local-private-only'&&p.manifest===approval.manifest&&p.revision,'private_candidate_disabled');return this.pinned(p.revision);}
}
