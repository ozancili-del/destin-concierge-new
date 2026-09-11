import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {InteractiveBudget} from '../lib/destiny-brain/interactive-budget.js';
import {createBrokerOperations} from '../lib/destiny-brain/interactive-broker.js';
import {createBrainReadServices} from '../lib/destiny-brain/read-services.js';
import {createReviewLogger} from '../lib/destiny-brain/review-log.js';
const app=fileURLToPath(new URL('..',import.meta.url)),workspace=path.resolve(app,'../..');
const root=path.join(workspace,'work/private-brain-preview'),out=path.join(workspace,'outputs/private-interactive-cap5');
const apiKey=process.env.OPENAI_API_KEY;if(!apiKey||process.env.VERCEL_ENV)throw Error('existing_private_credentials_required');
await fs.mkdir(out,{recursive:true});
const authorization=JSON.parse(await fs.readFile(path.join(out,'AUTHORIZATION.json'),'utf8'));
if(authorization.authorization!=='local-private-interactive-2026-09-11-usd5'||authorization.capUsd!==5||authorization.externalWritesAuthorized!==false||authorization.reviewLoggingAuthorized!==true)throw Error('private_authorization_required');
const lock=await fs.open(path.join(out,'ACTIVE.lock'),'wx');
let broker,proxy,child;
async function close(){proxy?.close();broker?.close();child?.kill();await lock.close();await fs.unlink(path.join(out,'ACTIVE.lock')).catch(()=>{});}
try{
  // Only unauthenticated connectivity is performed at startup. No model request.
  const check=await fetch('https://api.openai.com/v1/models',{redirect:'error',signal:AbortSignal.timeout(25000)});await check.body?.cancel();
  await fs.writeFile(path.join(out,'CONNECTIVITY.json'),JSON.stringify({at:new Date().toISOString(),httpStatus:check.status,authenticated:false,bodySent:false}));
  const budget=await new InteractiveBudget(out).init(),token=randomBytes(32).toString('hex');
  const reviewLogger=createReviewLogger({env:process.env,spreadsheetId:authorization.reviewSpreadsheetId,tabName:authorization.reviewTabName});
  const operations=createBrokerOperations({apiKey,budget,services:createBrainReadServices({env:process.env}),reviewLogger});
  broker=http.createServer(async(req,res)=>{
    res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
    const supplied=Buffer.from(String(req.headers['x-private-broker']||'')),expected=Buffer.from(token);
    if(req.method!=='POST'||supplied.length!==expected.length||!timingSafeEqual(supplied,expected)){res.writeHead(403);res.end('{"error":"denied"}');return;}
    try{let size=0;const chunks=[];for await(const b of req){size+=b.length;if(size>1500000)throw Error('request_too_large');chunks.push(b);}const p=JSON.parse(Buffer.concat(chunks).toString());const result=await operations(req.url.slice(1),p);res.end(JSON.stringify(result));}
    catch(e){res.writeHead(503);res.end(JSON.stringify({error:['cost_cap','budget_halted','request_failed_or_usage_uncertain'].includes(e.message)?e.message:'private_operation_unavailable'}));}
  });await new Promise(r=>broker.listen(0,'127.0.0.1',r));
  const clean={};for(const name of ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','HOMEDRIVE','HOMEPATH','ComSpec','PATHEXT','NUMBER_OF_PROCESSORS'])if(process.env[name])clean[name]=process.env[name];
  // Prevent Next's dotenv loading from importing any server credential into the
  // public app process. Credential values are never logged or copied to disk.
  for(const file of(await fs.readdir(app)).filter(f=>/^\.env(?:\.|$)/.test(f))){const text=await fs.readFile(path.join(app,file),'utf8');for(const m of text.matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm))clean[m[1]]='';}
  Object.assign(clean,{OPENAI_API_KEY:'disabled-public-placeholder',NEXT_TELEMETRY_DISABLED:'1',DESTINY_PRIVATE_RUNTIME:'1',DESTINY_PRIVATE_MODEL_CALLS:'1',DESTINY_PRIVATE_REVIEW_LOG:'1',DESTINY_PRIVATE_STORE:root,DESTINY_PRIVATE_BROKER_URL:`http://127.0.0.1:${broker.address().port}`,DESTINY_PRIVATE_BROKER_TOKEN:token,NODE_OPTIONS:`--require "${path.join(app,'scripts/private-offline-guard.cjs').replaceAll('\\','/')}"`});delete clean.VERCEL_ENV;
  child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3220'],{cwd:app,env:clean,stdio:['ignore','inherit','inherit'],windowsHide:true});
  child.once('exit',()=>{close().finally(()=>process.exit(1));});
  proxy=http.createServer((req,res)=>{
    const url=new URL(req.url,'http://127.0.0.1:3219'),allowed=['/destiny-private','/voice-lab','/api/destiny-private-chat','/api/destiny-private-voice','/api/destiny-private-audio','/api/destiny-private-budget','/favicon-512.png'].includes(url.pathname)||url.pathname.startsWith('/_next/static/')||/^\/_next\/data\/[^/]+\/(destiny-private|voice-lab)\.json$/.test(url.pathname);
    if(!allowed||req.headers.host!=='127.0.0.1:3219'||Object.keys(req.headers).some(k=>k==='forwarded'||k.startsWith('x-forwarded-')||k==='x-real-ip')||(req.method==='POST'&&req.headers.origin!=='http://127.0.0.1:3219')){res.writeHead(404);res.end();return;}
    const headers={...req.headers,host:'127.0.0.1:3220',...(req.headers.origin?{origin:'http://127.0.0.1:3220'}:{})};
    const target=http.request({hostname:'127.0.0.1',port:3220,path:req.url,method:req.method,headers},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res);});target.on('error',()=>{if(!res.headersSent)res.writeHead(503);res.end();});req.pipe(target);
  });await new Promise(r=>proxy.listen(3219,'127.0.0.1',r));
  await fs.writeFile(path.join(out,'ACTIVE.json'),JSON.stringify({at:new Date().toISOString(),url:'http://127.0.0.1:3219/destiny-private',voice:'http://127.0.0.1:3219/voice-lab',capUsd:5,credentialInNextProcess:false,publicRoutesBlocked:true,externalWritesEnabled:false,reviewLoggingEnabled:true,reviewTab:authorization.reviewTabName,automaticModelCalls:0,budget:budget.status()},null,2));
  console.log(JSON.stringify({status:'PRIVATE_INTERACTIVE_ENABLED',capUsd:5,budget:budget.status(),automaticModelCalls:0}));
  process.on('SIGINT',()=>close().finally(()=>process.exit(0)));process.on('SIGTERM',()=>close().finally(()=>process.exit(0)));
}catch(e){await close();console.error('Private interactive startup stopped:',e.code||e.name);process.exitCode=1;}
