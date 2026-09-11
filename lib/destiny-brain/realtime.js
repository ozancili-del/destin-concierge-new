import {isPrivatePeer} from './boundary.js';
import {VOICE_MODEL,VOICE_OUTPUT} from '../destiny-agent/voice-experience.js';

export function createPrivateRealtimeHandler({env=process.env,fetchImpl=fetch}={}){
  return async(req,res)=>{
    res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');
    if(!isPrivatePeer(req,env))return res.status(404).json({error:'not_found'});
    if(req.method!=='POST')return res.status(405).json({error:'post_required'});
    if(req.headers.origin!==`http://${req.headers.host}`)return res.status(403).json({error:'origin_denied'});
    if(env.DESTINY_PRIVATE_BROKER_URL)return res.status(409).json({error:'bounded_voice_required'});
    if(env.DESTINY_PRIVATE_MODEL_CALLS!=='1'||!env.OPENAI_API_KEY)return res.status(503).json({error:'private_model_disabled'});
    if(!String(req.headers['content-type']||'').startsWith('application/sdp'))return res.status(415).json({error:'sdp_required'});
    try{
      let size=0;const chunks=[];
      for await(const chunk of req){size+=chunk.length;if(size>100000)return res.status(413).json({error:'sdp_too_large'});chunks.push(chunk);}
      const sdp=Buffer.concat(chunks).toString('utf8');if(!sdp.startsWith('v=0'))return res.status(400).json({error:'sdp_invalid'});
      const session={type:'realtime',model:VOICE_MODEL,output_modalities:['audio'],max_output_tokens:1600,
        instructions:'You are the private Destiny speech renderer. Transcribe guest speech. Only read the authoritative answer supplied by the application, verbatim with natural prosody. Do not decide intent, answer from your own knowledge, change facts, take actions, choose tools, add recommendations, or research anything. Links are shown by the application; do not read URLs. No business tools are available.',
        audio:{input:{transcription:{model:'gpt-4o-mini-transcribe',language:'en'},noise_reduction:{type:'near_field'},turn_detection:null},output:VOICE_OUTPUT},tools:[],tool_choice:'none'};
      const body=new FormData();body.set('sdp',sdp);body.set('session',JSON.stringify(session));
      const response=await fetchImpl('https://api.openai.com/v1/realtime/calls',{method:'POST',headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`},body,signal:AbortSignal.timeout(25000)});
      if(!response.ok)return res.status(502).json({error:'private_voice_unavailable'});
      res.setHeader('Content-Type','application/sdp');res.setHeader('X-Destiny-Voice-Model',VOICE_MODEL);
      return res.status(200).send(await response.text());
    }catch{return res.status(502).json({error:'private_voice_unavailable'});}
  };
}
