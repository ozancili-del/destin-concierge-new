import fs from 'node:fs/promises';
import path from 'node:path';
import {isPrivatePeer} from '../../lib/destiny-brain/boundary.js';
import {brokerCall} from '../../lib/destiny-brain/broker-client.js';
import {verifyCookie} from '../../lib/destiny-runtime/private-handler.js';
import {LocalSessionStore} from '../../lib/destiny-runtime/local-store.js';
import {openWebSession,webPreviewEnabled} from '../../lib/destiny-brain/web-preview.js';
export const config={api:{bodyParser:{sizeLimit:'1400kb'}}};
export default async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');
  if(process.env.VERCEL_ENV==='preview')return webAudio(req,res);
  if(!isPrivatePeer(req))return res.status(404).json({error:'not_found'});
  if(req.method!=='POST'||req.headers.origin!==`http://${req.headers.host}`)return res.status(403).json({error:'origin_denied'});
  if(process.env.DESTINY_PRIVATE_MODEL_CALLS!=='1')return res.status(503).json({error:'private_model_disabled'});
  try{
    if(req.body?.op==='transcribe')return res.json(await brokerCall('transcribe',{wav:req.body.wav}));
    if(req.body?.op!=='speech')return res.status(400).json({error:'invalid_audio_operation'});
    const root=path.join(process.env.DESTINY_PRIVATE_STORE,'accepted-brain-v1'),key=process.env.DESTINY_PRIVATE_SESSION_KEY||await fs.readFile(path.join(root,'session-key'),'utf8');
    const raw=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('destiny_private_brain_v1='))?.split('=')[1],id=verifyCookie(raw,key);
    if(!id)return res.status(401).json({error:'session_required'});
    const session=await new LocalSessionStore(path.join(root,'sessions')).read(id),result=session.lastTurn?.result;
    if(!result||result.failure||result.decisionId!==req.body.decisionId)return res.status(409).json({error:'current_authoritative_answer_required'});
    const text=result.reply.replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g,'$1').replace(/https?:\/\/\S+/g,'').replace(/[*#]/g,'');
    return res.json(await brokerCall('speech',{text,decisionId:result.decisionId}));
  }catch(e){return res.status(503).json({error:['cost_cap','budget_halted','request_failed_or_usage_uncertain'].includes(e.message)?e.message:'private_audio_unavailable'});}
}

async function webAudio(req,res){
  const host=String(req.headers.host||'');
  if(!webPreviewEnabled()||req.method!=='POST'||req.headers.origin!==`https://${host}`||!/\.vercel\.app$/i.test(host)||!req.headers['x-vercel-id'])return res.status(404).json({error:'not_found'});
  try{
    if(req.body?.op==='transcribe'){
      const bytes=Buffer.from(String(req.body.wav||''),'base64');if(!bytes.length||bytes.length>1400000)return res.status(400).json({error:'invalid_audio'});
      const form=new FormData();form.set('file',new Blob([bytes],{type:'audio/wav'}),'private-input.wav');form.set('model','whisper-1');form.set('response_format','verbose_json');form.set('language','en');
      const response=await fetch('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},body:form,signal:AbortSignal.timeout(45000)});
      if(!response.ok)throw Error('transcription_failed');const data=await response.json();return res.json({text:data.text});
    }
    if(req.body?.op!=='speech')return res.status(400).json({error:'invalid_audio_operation'});
    const session=openWebSession(req.body.sessionToken);const result=session?.lastTurn?.result;
    if(!result||result.failure||result.decisionId!==req.body.decisionId)return res.status(409).json({error:'current_authoritative_answer_required'});
    // Links are visual companions. Never synthesize a URL character by character.
    const text=result.reply.replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g,'$1').replace(/https?:\/\/\S+/g,'').replace(/[*#]/g,'').trim();
    if(!text||text.length>16000)return res.status(400).json({error:'invalid_speech_text'});
    const clips=[];for(const part of text.match(/[\s\S]{1,4000}/g)){
      const response=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'tts-1',voice:'nova',input:part,response_format:'mp3'}),signal:AbortSignal.timeout(45000)});
      if(!response.ok)throw Error('speech_failed');clips.push(Buffer.from(await response.arrayBuffer()).toString('base64'));
    }
    return res.json({clips,decisionId:result.decisionId});
  }catch{return res.status(503).json({error:'private_audio_unavailable'});}
}
