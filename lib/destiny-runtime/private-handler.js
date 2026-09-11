import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { createDefaultState } from '../destiny-agent/business.js';
import { executeTurn } from './execute.js';
import { normalizePageContext } from './policy.js';
import { digest } from './artifact.js';
import {adaptChannel} from './conversation.js';
import {hasUntrustedForwarding} from '../destiny-brain/boundary.js';

function sessionCookie(sessionId,key){return `${sessionId}.${createHmac('sha256',key).update(sessionId).digest('hex')}`;}
export function verifyCookie(value,key){
  const [id,signature]=String(value||'').split('.');if(!/^[a-zA-Z0-9_-]{16,100}$/.test(id||'')||!/^[a-f0-9]{64}$/.test(signature||''))return null;
  const expected=sessionCookie(id,key).split('.')[1];return timingSafeEqual(Buffer.from(signature),Buffer.from(expected))?id:null;
}
export function createPrivateHandler({channel,reader,sessions,interpreter,services,scopedOpenAI,reviewLogger=null,sessionKey,candidateRevision=null,enabled=false,environment=process.env.VERCEL_ENV,executor=executeTurn,cookieName='destiny_private_conversation'}){
  const present=result=>result.version>=2?adaptChannel(result,channel):result;
  if(!['chat','voice'].includes(channel))throw new Error('invalid_private_channel');
  return async function handler(req,res){
    res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
    // Fail closed even if someone accidentally adds the flag to production or a
    // public preview. This filesystem adapter is exclusively local Phase 1.
    const peer=req.socket?.remoteAddress,host=String(req.headers?.host||'');
    if(!enabled||environment||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(peer)||! /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)||hasUntrustedForwarding(req))return res.status(404).json({error:'not_found'});
    if(req.method!=='POST')return res.status(405).json({error:'method_not_allowed'});
    if(req.headers.origin!==`http://${host}`)return res.status(403).json({error:'origin_denied'});
    if(typeof sessionKey!=='string'||sessionKey.length<32)return res.status(503).json({error:'private_session_unconfigured'});
    const body=req.body||{};
    if(JSON.stringify(body).length>18000||typeof body.text!=='string'||body.text.length>12000||!body.text.trim())return res.status(400).json({error:'invalid_request'});
    if(['authority','profile','grants','routerPlan','proposal','revision','business','state'].some(k=>k in body))return res.status(400).json({error:'client_authority_forbidden'});
    const abort=new AbortController();
    const onAborted=()=>abort.abort();
    const onClosed=()=>{if(!res.writableEnded)abort.abort();};
    req.once?.('aborted',onAborted);res.once?.('close',onClosed);
    try{
      const name=cookieName;
      const raw=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(`${name}=`))?.slice(name.length+1);
      let id=verifyCookie(raw,sessionKey),session;
      if(raw&&!id)return res.status(401).json({error:'session_signature_invalid'});
      if(id)session=await sessions.read(id);
      else{
        id=randomBytes(18).toString('base64url');
        const loaded=candidateRevision?await reader.pinned(candidateRevision):await reader.startSession();
        session=await sessions.create({id,version:0,revision:loaded.revision,business:createDefaultState(),pageContext:normalizePageContext(body.pageContext),history:[],category:null,offeredEntityIds:[],pendingSearch:null});
        res.setHeader('Set-Cookie',`${name}=${sessionCookie(id,sessionKey)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=7200`);
      }
      const turnId=typeof body.turnId==='string'&&/^[a-zA-Z0-9._:-]{1,100}$/.test(body.turnId)?body.turnId:randomBytes(12).toString('hex');
      if(session.lastTurn?.id===turnId){if(session.lastTurn.inputHash!==digest(body.text))return res.status(409).json({error:'turn_id_collision'});return res.status(200).json({...present(session.lastTurn.result),version:session.version,replayed:true});}
      if(body.version!==undefined&&body.version!==session.version)return res.status(409).json({error:'session_version_conflict',version:session.version});
      const loaded=await reader.pinned(session.revision);
      let result;
      let next;
      const startedAt=Date.now();
      try{next=await sessions.turn(id,session.version,async current=>{
        const executed=await executor({text:body.text,history:current.history,session:current,artifact:loaded.artifact,interpreter,services,scopedOpenAI,openai:scopedOpenAI,signal:abort.signal,authority:{channel:'chat',grants:[],verifiedGuest:false},traceId:randomBytes(16).toString('hex'),turnId,revokedFactIds:reader.revokedFactIds});
        result=structuredClone(executed.result);result.trace.cacheState=loaded.cacheState;
        return {...executed.session,lastTurn:{id:turnId,inputHash:digest(body.text),result}};
      });}catch(error){
        if(/session_version_conflict/.test(String(error.message))){const latest=await sessions.read(id);if(latest.lastTurn?.id===turnId&&latest.lastTurn.inputHash===digest(body.text))return res.status(200).json({...present(latest.lastTurn.result),version:latest.version,replayed:true});}
        throw error;
      }
      if(typeof reviewLogger==='function'){
        const tools=(result.trace?.tools||[]).map(item=>item?.name||item?.type||item?.tool||item?.status).filter(Boolean);
        const payload={timestamp:new Date().toISOString(),anonymousSessionId:digest(`review:${id}`).slice(0,24),turnId,channel,question:body.text,answer:result.reply,links:result.links||[],tools:[...new Set(tools)],responseTimeMs:Date.now()-startedAt,hqRevision:result.hqRevision||'',brainVersion:`${result.trace?.route||'private-brain'}/v${result.version||1}`,decisionId:result.decisionId||''};
        // This is the only explicitly authorized external write in the preview.
        // It is best-effort so Sheets latency can never delay a guest response.
        Promise.resolve(reviewLogger(payload)).catch(()=>{});
      }
      return res.status(200).json({...present(result),version:next.version});
    }catch(error){
      const conflict=/conflict/.test(String(error.message));
      return res.status(conflict?409:503).json({error:conflict?'session_conflict':'private_runtime_unavailable'});
    }finally{req.removeListener?.('aborted',onAborted);res.removeListener?.('close',onClosed);}
  };
}
