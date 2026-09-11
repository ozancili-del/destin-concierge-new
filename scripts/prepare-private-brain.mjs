import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import approval from '../lib/destiny-brain/ACCEPTED-SOURCE.json' with {type:'json'};
import {PrivateEnvelopeStore} from '../lib/destiny-brain/envelope-store.js';
const [operation,root,input]=process.argv.slice(2);
if(!['install','disable','rollback','status'].includes(operation)||!path.isAbsolute(root||''))throw Error('Usage: prepare-private-brain.mjs install|disable|rollback|status ABSOLUTE_STORE [ABSOLUTE_ENVELOPE]');
const store=new PrivateEnvelopeStore(root),prior=await store.pointer();
if(operation==='install'){
  if(!path.isAbsolute(input||''))throw Error('absolute_envelope_required');
  for(const item of approval.files){const bytes=await fs.readFile(fileURLToPath(new URL('../lib/destiny-brain/accepted/'+item.path,import.meta.url)));if(createHash('sha256').update(bytes).digest('hex')!==item.sha256)throw Error('accepted_runtime_drift');}
  const envelope=JSON.parse(await fs.readFile(input,'utf8'));await store.put(envelope);
  try{await fs.writeFile(path.join(store.root,'session-key'),randomBytes(32).toString('hex'),{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}
  if(prior?.revision!==envelope.revision)await store.select(envelope.revision,{expectedGeneration:prior?.generation||0});
}else if(operation==='disable')await store.select(null,{expectedGeneration:prior?.generation||0});
else if(operation==='rollback')await store.rollback({expectedGeneration:prior?.generation||0});
console.log(JSON.stringify({pointer:await store.pointer(),modelCallsEnabled:false,externalWritesEnabled:false,networkCalls:0}));
