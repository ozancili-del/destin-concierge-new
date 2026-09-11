import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {deflateRawSync,inflateRawSync} from 'node:zlib';
import OpenAI from 'openai';
import envelope from './accepted/preview-envelope.json' with {type:'json'};
import {validateEnvelope} from './envelope-store.js';
import {executePrivateBrain} from './executor.js';
import {createBrainReadServices} from './read-services.js';
import {createReviewLogger} from './review-log.js';
import {createDefaultState} from '../destiny-agent/business.js';
import {normalizePageContext} from '../destiny-runtime/policy.js';
import {digest} from '../destiny-runtime/artifact.js';

const TOKEN_PREFIX='dpw1';
const REVIEW_TAB='Destiny Brain Review';
validateEnvelope(envelope);

export function webPreviewEnabled(env=process.env){
  return env.VERCEL_ENV==='preview'&&!!env.OPENAI_API_KEY&&!!webSigningKey(env);
}
function webSigningKey(env=process.env){return env.VOICE_RECORDING_UPLOAD_SECRET||env.REGRESSION_SECRET||'';}
function signature(value,key){return createHmac('sha256',key).update(value).digest('hex');}
function equal(a,b){const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y);}
export function sealWebSession(session,env=process.env){
  const body=deflateRawSync(Buffer.from(JSON.stringify(session))).toString('base64url');
  const unsigned=`${TOKEN_PREFIX}.${body}`;
  return `${unsigned}.${signature(unsigned,webSigningKey(env))}`;
}
export function openWebSession(token,env=process.env){
  if(typeof token!=='string'||token.length>60000)return null;
  const [prefix,body,sig,...rest]=token.split('.');
  if(prefix!==TOKEN_PREFIX||!body||!sig||rest.length)return null;
  const unsigned=`${prefix}.${body}`;
  if(!equal(sig,signature(unsigned,webSigningKey(env))))return null;
  try{
    const parsed=JSON.parse(inflateRawSync(Buffer.from(body,'base64url'),{maxOutputLength:120000}).toString());
    return parsed&&typeof parsed==='object'?parsed:null;
  }catch{return null;}
}
function samePreviewOrigin(req){
  const host=String(req.headers.host||'');
  return req.headers.origin===`https://${host}`&&/\.vercel\.app$/i.test(host)&&!!req.headers['x-vercel-id'];
}
function freshSession(body){
  return {id:randomBytes(18).toString('base64url'),version:0,revision:envelope.revision,business:createDefaultState(),pageContext:normalizePageContext(body.pageContext),history:[],category:null,offeredEntityIds:[],pendingSearch:null};
}
let client;
export async function servePrivateWeb(channel,req,res,{env=process.env}={}){
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
  if(!webPreviewEnabled(env)||!samePreviewOrigin(req))return res.status(404).json({error:'not_found'});
  if(req.method!=='POST')return res.status(405).json({error:'method_not_allowed'});
  const body=req.body||{};
  if(JSON.stringify(body).length>76000||typeof body.text!=='string'||!body.text.trim()||body.text.length>12000)return res.status(400).json({error:'invalid_request'});
  if(['authority','profile','grants','routerPlan','proposal','revision','business','state'].some(k=>k in body))return res.status(400).json({error:'client_authority_forbidden'});
  let session=body.sessionToken?openWebSession(body.sessionToken,env):freshSession(body);
  if(!session||session.revision!==envelope.revision)return res.status(401).json({error:'session_invalid'});
  if(body.version!==undefined&&body.version!==session.version)return res.status(409).json({error:'session_version_conflict',version:session.version});
  const turnId=typeof body.turnId==='string'&&/^[a-zA-Z0-9._:-]{1,100}$/.test(body.turnId)?body.turnId:randomBytes(12).toString('hex');
  if(session.lastTurn?.id===turnId){if(session.lastTurn.inputHash!==digest(body.text))return res.status(409).json({error:'turn_id_collision'});return res.json({...session.lastTurn.result,version:session.version,replayed:true,sessionToken:sealWebSession(session,env)});}
  const startedAt=Date.now();
  try{
    client??=new OpenAI({apiKey:env.OPENAI_API_KEY,maxRetries:0,timeout:30000});
    const executed=await executePrivateBrain({text:body.text,session,artifact:envelope,openai:client,services:createBrainReadServices({env}),turnId,traceId:randomBytes(16).toString('hex')});
    const result=executed.result;
    session={...executed.session,lastTurn:{id:turnId,inputHash:digest(body.text),result}};
    const logger=createReviewLogger({env,spreadsheetId:env.GOOGLE_SHEET_ID,tabName:REVIEW_TAB});
    const tools=(result.trace?.tools||[]).map(item=>item?.name||item?.type||item?.tool||item?.status).filter(Boolean);
    const review={timestamp:new Date().toISOString(),anonymousSessionId:digest(`review:${session.id}`).slice(0,24),turnId,channel,question:body.text,answer:result.reply,links:result.links||[],tools:[...new Set(tools)],responseTimeMs:Date.now()-startedAt,hqRevision:result.hqRevision||'',brainVersion:`${result.trace?.route||'private-brain'}/v${result.version||1}`,decisionId:result.decisionId||''};
    Promise.resolve(logger(review)).catch(()=>{});
    return res.json({...result,version:session.version,sessionToken:sealWebSession(session,env)});
  }catch{return res.status(503).json({error:'private_runtime_unavailable'});}
}
