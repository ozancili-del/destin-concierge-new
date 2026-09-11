import fs from 'node:fs/promises';
import path from 'node:path';
import {atomicWrite} from '../destiny-runtime/local-store.js';
export class InteractiveBudget {
  constructor(root){this.root=root;this.file=path.join(root,'LEDGER.json');this.queue=Promise.resolve();}
  async init(){await fs.mkdir(this.root,{recursive:true});try{this.data=JSON.parse(await fs.readFile(this.file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;this.data={authorization:'local-private-interactive-2026-09-11-usd5',capMicros:5000000,halted:null,rows:[]};await this.save();}
    if(this.data.capMicros!==5000000||!Array.isArray(this.data.rows))throw Error('budget_integrity');
    if(this.data.rows.some((r,i)=>r.id!==i+1||!['reserved','settled','uncertain'].includes(r.status)||!Number.isSafeInteger(r.reservedMicros)||r.reservedMicros<=0||(r.settledMicros!==undefined&&(!Number.isSafeInteger(r.settledMicros)||r.settledMicros<0||r.settledMicros>r.reservedMicros)))||this.data.rows.reduce((s,r)=>s+(r.settledMicros??r.reservedMicros),0)>5000000)throw Error('budget_integrity');
    if(this.data.rows.some(r=>r.status==='reserved')){this.data.halted='unfinished_request_usage_uncertain';await this.save();}return this;
  }
  async save(){await atomicWrite(this.file,JSON.stringify(this.data,null,2));}
  status(){const settled=this.data.rows.reduce((s,r)=>s+(r.settledMicros??0),0),held=this.data.rows.reduce((s,r)=>s+(r.settledMicros===undefined?r.reservedMicros:0),0);return {capUsd:5,accountedUsd:(settled+held)/1e6,settledUsd:settled/1e6,reservedOrUncertainUsd:held/1e6,remainingUsd:Math.max(0,(5000000-settled-held)/1e6),halted:this.data.halted,requests:this.data.rows.length};}
  call(kind,reservedMicros,operation){const job=this.queue.then(async()=>{
    if(this.data.halted)throw Error('budget_halted');
    if(!Number.isSafeInteger(reservedMicros)||reservedMicros<=0)throw Error('invalid_reservation');
    if(Math.round(this.status().accountedUsd*1e6)+reservedMicros>5000000){this.data.halted='cost_cap';await this.save();throw Error('cost_cap');}
    const row={id:this.data.rows.length+1,kind,status:'reserved',reservedMicros,startedAt:new Date().toISOString()};this.data.rows.push(row);await this.save();
    try{const {value,settledMicros,usage}=await operation(row);if(!Number.isSafeInteger(settledMicros)||settledMicros<0||settledMicros>reservedMicros)throw Error('usage_outside_reserve');Object.assign(row,{status:'settled',settledMicros,usage,finishedAt:new Date().toISOString()});await this.save();return value;}
    catch{row.status='uncertain';delete row.settledMicros;this.data.halted='request_failed_or_usage_uncertain';await this.save();throw Error('request_failed_or_usage_uncertain');}
  });this.queue=job.catch(()=>{});return job;}
}
export function responseBounds(p){
  if(p.model!=='gpt-5.6-sol'||p.max_output_tokens!==2400||p.store!==false||p.stream!==false||p.service_tier!=='default'||p.reasoning?.effort!=='low'||p.text?.verbosity!=='low'||p.parallel_tool_calls!==false||(p.tools||[]).some(t=>t.type!=='function'))throw Error('request_outside_approved_bounds');
  const input=Buffer.byteLength(JSON.stringify(p))+65536;if(input>400000)throw Error('input_bound_exceeded');
  return {input,reserve:Math.ceil(input*(input>272000?10:5)+2400*(input>272000?30:20))};
}
export function settleResponse(u,b){
  const cached=u?.input_tokens_details?.cached_tokens||0,written=u?.input_tokens_details?.cache_write_tokens||0;
  if(!u||![u.input_tokens,u.output_tokens,cached,written].every(n=>Number.isSafeInteger(n)&&n>=0)||u.input_tokens>b.input||u.output_tokens>2400||cached+written>u.input_tokens)throw Error('usage_uncertain');
  const mult=u.input_tokens>272000?2:1;return Math.ceil((u.input_tokens-cached)*5*mult+cached*0.4*mult+u.output_tokens*(mult===2?30:20));
}
export function boundedWav(base64){
  if(typeof base64!=='string'||base64.length>1280060||!/^[A-Za-z0-9+/]*={0,2}$/.test(base64))throw Error('invalid_audio');
  const b=Buffer.from(base64,'base64');
  if(b.length<46||b.toString('ascii',0,4)!=='RIFF'||b.readUInt32LE(4)!==b.length-8||b.toString('ascii',8,12)!=='WAVE'||b.toString('ascii',12,16)!=='fmt '||b.readUInt32LE(16)!==16||b.readUInt16LE(20)!==1||b.readUInt16LE(22)!==1||b.readUInt32LE(24)!==16000||b.readUInt32LE(28)!==32000||b.readUInt16LE(32)!==2||b.readUInt16LE(34)!==16||b.toString('ascii',36,40)!=='data'||b.readUInt32LE(40)!==b.length-44||(b.length-44)%2)throw Error('invalid_pcm_wav');
  const seconds=(b.length-44)/32000;if(seconds>30)throw Error('audio_duration_exceeded');return {bytes:b,seconds,reserve:(Math.ceil(seconds)+1)*100};
}
