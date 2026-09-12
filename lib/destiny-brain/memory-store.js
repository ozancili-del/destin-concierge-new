import fs from 'node:fs/promises';
import path from 'node:path';
import {atomicWrite,withLock} from '../destiny-runtime/local-store.js';
export const MEMORY_TTL_MS=24*60*60*1000;
const validId=id=>{if(!/^[a-f0-9]{64}$/.test(id))throw Error('invalid_conversation_id');return id;};
export class FileMemoryStore{
  constructor(root,{now=Date.now}={}){if(!path.isAbsolute(root))throw Error('absolute_memory_root_required');this.root=path.join(root,'ordered-private-memory');this.now=now;}
  file(id){return path.join(this.root,validId(id)+'.json');}
  async locked(id,operation){
    for(let attempt=0;attempt<40;attempt++){
      try{return await withLock(this.file(id)+'.lock',operation);}
      catch(e){if(e.message!=='store_write_conflict'||attempt===39)throw e;await new Promise(r=>setTimeout(r,5));}
    }
  }
  async readRecord(id){try{const r=JSON.parse(await fs.readFile(this.file(id),'utf8'));if(r.expiresAt<=this.now())return null;return r;}catch(e){if(e.code==='ENOENT')return null;throw e;}}
  async read(id){try{return await this.locked(id,()=>this.readRecord(id));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
  async cas(id,version,next){
    await fs.mkdir(this.root,{recursive:true});
    try{return await this.locked(id,async()=>{
      const old=await this.readRecord(id);if((old?.storageVersion??-1)!==version)return false;
      if(next.expiresAt<=this.now())throw Error('conversation_expired');
      await atomicWrite(this.file(id),JSON.stringify(next));return true;
    });}catch(e){if(e.message==='store_write_conflict')return false;throw e;}
  }
  async purgeExpired(){
    await fs.mkdir(this.root,{recursive:true});
    for(const name of await fs.readdir(this.root))if(/^[a-f0-9]{64}\.json$/.test(name)){
      const file=path.join(this.root,name);
      try{await withLock(file+'.lock',async()=>{const r=JSON.parse(await fs.readFile(file,'utf8'));if(r.expiresAt<=this.now())await fs.unlink(file);});}catch(e){if(!['store_write_conflict','ENOENT'].includes(e.message)&&e.code!=='ENOENT')throw e;}
    }
  }
  startCleanup(){const timer=setInterval(()=>this.purgeExpired().catch(()=>{}),1000);timer.unref();return()=>clearInterval(timer);}
}
// One atomic compare-and-swap; expiry never extends when the conversation grows.
export const MEMORY_CAS_LUA=`local old=redis.call('GET',KEYS[1]); local expected=tonumber(ARGV[1]); if old then if cjson.decode(old).storageVersion~=expected then return 0 end elseif expected~=-1 then return 0 end; redis.call('SET',KEYS[1],ARGV[2],'PXAT',ARGV[3]); return 1`;
export class RedisMemoryStore{
  constructor({url,token,isolatedPreview=false,fetchImpl=fetch,now=Date.now}){
    const u=new URL(url);if(!isolatedPreview||u.protocol!=='https:'||u.username||u.password||u.search||u.pathname!=='/'||!token)throw Error('dedicated_preview_memory_required');
    this.url=u.origin;this.token=token;this.fetch=fetchImpl;this.now=now;
  }
  async command(command){const r=await this.fetch(this.url,{method:'POST',headers:{Authorization:'Bearer '+this.token,'Content-Type':'application/json'},body:JSON.stringify(command),redirect:'error',signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error('memory_transport_failed');const body=await r.json();if(body.error||!Object.hasOwn(body,'result'))throw Error('memory_command_failed');return body.result;}
  key(id){return 'destiny:synthetic-preview:ordered-v1:'+validId(id);}
  async read(id){const raw=await this.command(['GET',this.key(id)]);if(raw===null)return null;const r=JSON.parse(raw);return r.expiresAt>this.now()?r:null;}
  async cas(id,version,next){if(next.expiresAt<=this.now())throw Error('conversation_expired');return await this.command(['EVAL',MEMORY_CAS_LUA,1,this.key(id),version,JSON.stringify(next),next.expiresAt])===1;}
}
