import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { canonical, digest, assertArtifact } from './artifact.js';

const ID=/^[a-f0-9]{64}$/;
export async function atomicWrite(filename, data) {
  const temp=`${filename}.${randomUUID()}.tmp`;
  const handle=await fs.open(temp,'wx',0o600);
  try { await handle.writeFile(data); await handle.sync(); } finally { await handle.close(); }
  try { await fs.rename(temp,filename); } catch(error) { await fs.unlink(temp).catch(()=>{}); throw error; }
}
export async function withLock(filename, operation) {
  // Fail closed on a concurrent writer or abandoned lock. Never guess that an
  // older process died and steal its lock; operator recovery is explicit.
  let handle;
  try { handle=await fs.open(filename,'wx',0o600); } catch(error) { if(error.code==='EEXIST')throw new Error('store_write_conflict');throw error; }
  try { return await operation(); } finally { await handle.close();await fs.unlink(filename); }
}
export function signReceipt(receipt, key) {
  if(typeof key!=='string'||key.length<32)throw new Error('publisher_signing_key_required');
  return {receipt,signature:createHmac('sha256',key).update(canonical(receipt)).digest('hex')};
}
function verifyReceipt(signed,key,revision,allowTestReceipts,expectedRuntimeFingerprint) {
  const expected=signReceipt(signed?.receipt,key).signature;
  const actual=String(signed?.signature||'');
  if(!ID.test(actual)||!timingSafeEqual(Buffer.from(actual),Buffer.from(expected)))throw new Error('publication_receipt_invalid');
  const r=signed.receipt;
  if(r.revision!==revision||r.status!=='passed'||r.failed!==0||r.executed!==r.expected||r.expected<1||!ID.test(r.suiteHash||''))throw new Error('publication_gate_not_passed');
  if(r.kind!=='semantic_live'&&!(allowTestReceipts&&r.kind==='test_fixture'))throw new Error('publication_behavior_not_executed');
  if(r.kind==='semantic_live'&&(!ID.test(expectedRuntimeFingerprint||'')||r.runtimeFingerprint!==expectedRuntimeFingerprint))throw new Error('publication_runtime_fingerprint_mismatch');
  if(!r.compilerPassed||!r.structuralPassed||!r.parityPassed)throw new Error('publication_required_gate_missing');
}

// Reference implementation for private single-host execution. It deliberately
// refuses Vercel: ephemeral function disks cannot provide durable CAS/sessions.
export class LocalArtifactStore {
  constructor(root,{signingKey,expectedRuntimeFingerprint,allowTestReceipts=false,environment=process.env.VERCEL_ENV}={}) {
    if(environment)throw new Error('local_store_requires_durable_single_host');
    this.root=path.resolve(root);this.signingKey=signingKey;this.expectedRuntimeFingerprint=expectedRuntimeFingerprint;this.allowTestReceipts=allowTestReceipts;
  }
  async init(){await fs.mkdir(path.join(this.root,'objects'),{recursive:true});}
  objectPath(revision){if(!ID.test(revision))throw new Error('invalid_revision');return path.join(this.root,'objects',`${revision}.json`);}
  async put(artifact){
    const revision=digest(artifact);assertArtifact(artifact,revision);await this.init();
    const filename=this.objectPath(revision),bytes=canonical(artifact);
    // Temp write + exclusive link installs only fully synced immutable bytes.
    const temp=path.join(this.root,`${randomUUID()}.upload`);
    await atomicWrite(temp,bytes);
    try {await fs.link(temp,filename);}catch(error){if(error.code!=='EEXIST')throw error;await this.read(revision);}finally{await fs.unlink(temp);}
    return revision;
  }
  async read(revision){return assertArtifact(JSON.parse(await fs.readFile(this.objectPath(revision),'utf8')),revision);}
  async pointer(){try{return JSON.parse(await fs.readFile(path.join(this.root,'pointer.json'),'utf8'));}catch(error){if(error.code==='ENOENT')return null;throw error;}}
  async promote(revision,{expectedGeneration=0,publicationId,signedReceipt}={}){
    if(!/^[a-zA-Z0-9._:-]{1,120}$/.test(publicationId||''))throw new Error('publication_id_required');
    await this.init();await this.read(revision);verifyReceipt(signedReceipt,this.signingKey,revision,this.allowTestReceipts,this.expectedRuntimeFingerprint);
    return withLock(path.join(this.root,'publish.lock'),async()=>{
      const current=await this.pointer();
      const prior=current?.history?.find(r=>r.publicationId===publicationId);
      if(prior){if(prior.revision!==revision)throw new Error('publication_id_collision');return {pointer:current,alreadyPublished:true};}
      if((current?.generation||0)!==expectedGeneration)throw new Error('publication_predecessor_conflict');
      const receipt={publicationId,revision,previousRevision:current?.revision||null,generation:expectedGeneration+1,gate:signedReceipt};
      const pointer={schemaVersion:1,revision,previousRevision:current?.revision||null,generation:receipt.generation,history:[...(current?.history||[]),receipt]};
      // Pointer and receipt history form one atomic durable record.
      await atomicWrite(path.join(this.root,'pointer.json'),canonical(pointer));
      return {pointer,alreadyPublished:false};
    });
  }
  async rollback({expectedGeneration,publicationId}={}){
    const pointer=await this.pointer();
    if(!pointer?.previousRevision)throw new Error('rollback_no_previous_revision');
    const receipt=pointer.history.find(r=>r.revision===pointer.previousRevision)?.gate;
    return this.promote(pointer.previousRevision,{expectedGeneration,publicationId,signedReceipt:receipt});
  }
}

export class PinnedArtifactReader {
  constructor(store,{revokedFactIds=[]}={}){this.store=store;this.cache=new Map();this.inflight=new Map();this.lastKnownGood=null;this.revokedFactIds=new Set(revokedFactIds);}
  async load(revision){
    if(this.cache.has(revision))return {artifact:this.cache.get(revision),cacheState:'hit'};
    if(!this.inflight.has(revision))this.inflight.set(revision,this.store.read(revision).then(a=>{this.cache.set(revision,a);return a;}).finally(()=>this.inflight.delete(revision)));
    return {artifact:await this.inflight.get(revision),cacheState:'miss'};
  }
  async startSession(){
    try {const p=await this.store.pointer();if(!p)throw new Error('pointer_absent');const loaded=await this.load(p.revision);this.lastKnownGood=p.revision;return {revision:p.revision,...loaded};}
    catch(error){if(!this.lastKnownGood)throw error;return {revision:this.lastKnownGood,...await this.load(this.lastKnownGood),cacheState:'last_known_good'};}
  }
  async pinned(revision){return {revision,...await this.load(revision)};}
}

export class LocalSessionStore {
  constructor(root){this.root=path.resolve(root);}
  file(sessionId){if(!/^[a-zA-Z0-9_-]{16,100}$/.test(sessionId))throw new Error('invalid_session_id');return path.join(this.root,`${sessionId}.json`);}
  async create(session){await fs.mkdir(this.root,{recursive:true});const file=this.file(session.id);return withLock(`${file}.lock`,async()=>{try{await fs.access(file);throw new Error('session_exists');}catch(e){if(e.code!=='ENOENT')throw e;}await atomicWrite(file,canonical(session));return session;});}
  async read(id){return JSON.parse(await fs.readFile(this.file(id),'utf8'));}
  async turn(id,expectedVersion,operation){const file=this.file(id);return withLock(`${file}.lock`,async()=>{const current=await this.read(id);if(current.version!==expectedVersion)throw new Error('session_version_conflict');const next=await operation(current);if(next.id!==id||next.version!==expectedVersion+1)throw new Error('session_transition_invalid');await atomicWrite(file,canonical(next));return next;});}
}
