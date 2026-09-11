import path from 'node:path';
import fs from 'node:fs/promises';
import {brokerClient,brokerServices,brokerReviewLogger} from './broker-client.js';
import {LocalSessionStore} from '../destiny-runtime/local-store.js';
import {createPrivateHandler} from '../destiny-runtime/private-handler.js';
import {PrivateEnvelopeStore,PrivateEnvelopeReader} from './envelope-store.js';
import {executePrivateBrain} from './executor.js';
import {createBrainReadServices} from './read-services.js';
import {privateBrainEnabled,isPrivatePeer} from './boundary.js';

export function createBrainServer({env=process.env,client,serviceFactory=args=>env.DESTINY_PRIVATE_BROKER_URL?brokerServices(env):createBrainReadServices({env,...args}),reviewLoggerFactory=()=>env.DESTINY_PRIVATE_REVIEW_LOG==='1'&&env.DESTINY_PRIVATE_BROKER_URL?brokerReviewLogger(env):null}={}){
let runtime;
async function getPrivateHandler(channel){
  if(!privateBrainEnabled(env))return createPrivateHandler({channel});
  if(!runtime){
    const root=env.DESTINY_PRIVATE_STORE;
    if(!root||!path.isAbsolute(root))throw Error('private_candidate_unconfigured');
    const store=new PrivateEnvelopeStore(root);
    const sessionKey=env.DESTINY_PRIVATE_SESSION_KEY||await fs.readFile(path.join(store.root,'session-key'),'utf8');
    if(sessionKey.length<32)throw Error('private_session_unconfigured');
    const openai=client??(env.DESTINY_PRIVATE_MODEL_CALLS==='1'&&env.DESTINY_PRIVATE_BROKER_URL?brokerClient(env):null);
    runtime={store,reader:new PrivateEnvelopeReader(store),sessions:new LocalSessionStore(path.join(store.root,'sessions')),
      executor:args=>executePrivateBrain({...args,services:serviceFactory({signal:args.signal})}),scopedOpenAI:openai,
      reviewLogger:reviewLoggerFactory(),sessionKey,cookieName:'destiny_private_brain_v1',environment:env.VERCEL_ENV,enabled:true};
  }
  const pointer=await runtime.store.pointer();
  if(!pointer?.revision)return createPrivateHandler({channel});
  return createPrivateHandler({channel,...runtime});
}
async function servePrivate(channel,req,res){
  if(!isPrivatePeer(req,env)){res.setHeader('Cache-Control','private, no-store');return res.status(404).json({error:'not_found'});}
  try{return await (await getPrivateHandler(channel))(req,res);}
  catch{res.setHeader('Cache-Control','private, no-store');return res.status(503).json({error:'private_runtime_unconfigured'});}
}
return {getPrivateHandler,servePrivate};
}
const server=createBrainServer();
export const servePrivate=server.servePrivate;
