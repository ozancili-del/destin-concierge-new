// Nonbillable tool/state replay. Typed interpretations are fixtures, not model predictions.
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {executeTool,mergeToolPatch} from '../lib/destiny-agent/orchestrator.js';
import {createDefaultState} from '../lib/destiny-agent/business.js';
import {OrderedContextRuntime} from '../lib/destiny-brain/ordered-context.js';
import {projectState} from '../lib/destiny-brain/accepted/kernel.mjs';
import {assertPayloadSafe} from '../lib/destiny-brain/accepted/vendor/privacy.mjs';
const root=process.cwd(),out=path.resolve(process.argv[2]||'outputs/private-capability-replay');
const git=(...args)=>execFileSync('git',['-c','safe.directory='+root,...args],{encoding:'utf8',maxBuffer:3000000});
const baseline=git('rev-parse','c239889^').trim(),old=git('show',baseline+':lib/destiny-agent/orchestrator.js'),current=await fs.readFile('lib/destiny-agent/orchestrator.js','utf8');
const body=s=>s.slice(s.indexOf('export async function executeTool('),s.indexOf('export async function applySafetyBackstops(')).replace(/\r\n/g,'\n');
if(body(old)!==body(current))throw Error('legacy_executeTool_drift');
const envelope=JSON.parse(await fs.readFile('lib/destiny-brain/accepted/preview-envelope.json','utf8'));
const clock={now:'2026-09-12T12:00:00Z',timeZone:'America/Chicago',locale:'en-US'};
const dates={arrival:'2026-10-05',departure:'2026-10-12'};
const booking={...dates,adults:3,children:0,preferredUnit:'707'};
const timing=(kind='retain_stay',extra={})=>({kind,start:null,end:null,offset_days:null,week_offset:null,weekdays:[],boundary:null,evidence:null,...extra});
const party=(operation='retain',extra={},text=null)=>({operation,adults:null,children_including_infants:null,non_infant_children:null,infants:null,total_guests:null,infants_mentioned:false,evidence:text,...extra});
const outcome=(kind,extra={})=>({id:'request',kind,description:'Synthetic capability replay',unit_ids:[],booking_operation:'refresh',booking_evidence:null,timing:timing(),unit_scope:null,origin_iata:null,origin_evidence:null,destination_iata:null,action_evidence:null,details:{guide_topic:null,event_category:null,severity:null,message:null,email:null,first_name:null,query:null},...extra});
const fixtures=[
 {id:'availability-ready',text:'Please check the saved trip.',booking,legacy:'check_availability',candidate:'check_availability',kind:'availability',expect:'Fresh controlled check returns valid URLs with three adults.'},
 {id:'booking-refresh',text:'Please resend my booking link.',booking,legacy:'build_booking_links',candidate:'build_booking_links',kind:'booking',expect:'Refresh checks availability and returns current party links.'},
 {id:'availability-unknown',text:'Please check the saved trip.',booking,service:'unknown',legacy:'check_availability',candidate:'check_availability',kind:'availability',expect:'Unknown service result does not become availability or booking success.'},
 {id:'missing-dates',text:'Can we book?',booking:{adults:3,children:0},legacy:'check_availability',candidate:'check_availability',kind:'availability',expect:'Clarify missing dates; no live call.'},
 {id:'missing-party',text:'Can we book these dates?',booking:dates,legacy:'check_availability',candidate:'check_availability',kind:'availability',expect:'Clarify unknown party; no guessed counts.'},
 {id:'two-units',text:'Check both condos for our group.',booking:{...booking,adults:4,children:3,preferredUnit:'both'},legacy:'check_availability',candidate:'check_availability',kind:'availability',expect:'Seven guests require a valid two-unit split.'},
 {id:'flight-known-party',text:'Flights from ORD for our saved dates.',booking,legacy:'build_flight_search',legacyArgs:{origin_text:'ORD',destination_iata:'VPS'},candidate:'build_flight_search',kind:'flight',outcome:{origin_iata:'ORD',origin_evidence:'ORD'},expect:'Flight link retains all three adults and date range; no fare claim.'},
 {id:'activity-remembered-dates',text:'Send dolphin cruise options.',booking,legacy:'get_activity_options',legacyArgs:{category:'dolphin'},candidate:'get_activity_options',candidateArgs:{category:'dolphin'},kind:'activity',expect:'TripShock link retains remembered dates without inventory claims.'},
 {id:'activity-no-dates',text:'Dolphin cruise options please.',booking:{},legacy:'get_activity_options',legacyArgs:{category:'dolphin'},candidate:'get_activity_options',candidateArgs:{category:'dolphin'},kind:'activity',expect:'Generic activity link remains available without lodging dates.'},
 {id:'car-no-dates',text:'Send the rental car comparison page.',booking:{},legacy:'get_local_guide',legacyArgs:{topic:'car'},candidate:'get_guide_link',kind:'guide',outcome:{details:{guide_topic:'car',event_category:null,severity:null,message:null,email:null,first_name:null,query:null}},expect:'Discover Cars link without unnecessary date clarification.'},
 {id:'weather-unavailable',text:'What is the weather tomorrow?',booking:{},legacy:'get_destin_weather',candidate:'get_destin_weather',kind:'weather',outcome:{timing:timing('relative_day',{offset_days:1,evidence:'tomorrow'})},expect:'Unavailable forecast remains unknown, never sunny/safe.'},
 {id:'beach-unavailable',text:'What are current beach conditions?',booking:{},legacy:'get_beach_conditions',candidate:'get_beach_conditions',kind:'beach',expect:'Unverified flags/surf/alerts are not treated as safe.'},
 {id:'reservation-denied',text:'Look up my reservation.',booking:{},legacy:'get_existing_booking',candidate:'get_existing_booking',kind:'existing_booking',expect:'No signed authorization or guest records supplied; deny lookup.'},
 {id:'hq-referral',text:'Where should I look if both units are unavailable?',booking:{},legacy:'get_business_knowledge',legacyArgs:{query:'referral both units unavailable',topics:[]},candidate:'browse_hq',candidateArgs:{topics:[]},kind:'knowledge',expect:'Inspect discoverability only; model selection and composed referral answer remain unverified.'}
];
const results=[];
for(const f of fixtures){
 const traces={legacy:[],candidate:[]};
 function services(arm){return {
  checkBothUnits:async(...args)=>{traces[arm].push({method:'checkBothUnits',args});return f.service==='unknown'?{'707':null,'1006':null}:{'707':true,'1006':true};},
  fetchPriceDrops:async(...args)=>{traces[arm].push({method:'fetchPriceDrops',args});return {drops:[]};},
  fetchDestinWeather:async()=>{traces[arm].push({method:'fetchDestinWeather'});return {status:'unavailable',forecast:[],checkedAt:clock.now};},
  fetchBeachConditions:async()=>{traces[arm].push({method:'fetchBeachConditions'});return {status:'unavailable',checkedAt:clock.now,flag:{status:'unavailable'},surf:{status:'unavailable'},alerts:{status:'unavailable'}};},
  fetchBlogContent:async topic=>{traces[arm].push({method:'fetchBlogContent',topic});return {status:'unavailable',content:'',url:null};}
 };}
 const legacyState=mergeToolPatch(createDefaultState(),{booking:f.booking});
 const legacy=await executeTool(f.legacy,f.legacyArgs||{},{state:legacyState,services:services('legacy'),latestUser:f.text,now:new Date(clock.now),sessionId:'synthetic-replay',logger:{log(){},error(){}},openai:{responses:{create(){throw Error('BILLABLE_CALL_FORBIDDEN');}}}});
 const r=new OrderedContextRuntime({artifact:envelope.artifact,publicKnowledge:envelope.publicKnowledge,clock,guest:f.text,state:{booking:f.booking},services:services('candidate'),memoryContext:{current:{turnId:f.id,text:f.text},future:[],language:'en',topic:null}});
 const context=await r.tool('interpret_conversation_context',{directed:true,relation:'independent',language:'en',languageOperation:'retain',languageEvidence:null,topicOperation:'retain',topic:{entity:null,location:null,category:null},cancelCurrentBy:null,cancellationEvidence:null});
 const interpretation=await r.tool('interpret_request',{base_revision:r.state.revision,party:party(),outcomes:[outcome(f.kind,f.outcome)]});
 const candidate=await r.tool(f.candidate,f.candidate==='browse_hq'?f.candidateArgs:{outcome_id:'request',...f.candidateArgs});
 results.push({id:f.id,input:f.text,fixture:f,expectedBehavior:f.expect,legacy:{raw:legacy,state:mergeToolPatch(legacyState,legacy.statePatch||{}),traces:traces.legacy},candidate:{context,interpretation,raw:candidate,state:projectState(r.state),traces:traces.candidate},guestFacingAnswer:null,answerReason:'No model invoked: these are raw tool/state outcomes, not composed Q&A.'});
}
const report={schemaVersion:1,kind:'nonbillable-controlled-tool-replay',baseline,legacyToolBodySha256:createHash('sha256').update(body(old)).digest('hex'),candidateParent:git('rev-parse','HEAD').trim(),cases:results.length,modelCalls:0,externalRequests:0,costUsd:0,limitations:['Typed intent fixtures bypass language understanding.','Controlled services do not prove live provider availability.','No microphone, speaker, browser timing or model answer-quality score.','Legacy tool implementation verified byte-equivalent to baseline after newline normalization.'],results};
assertPayloadSafe(report);
await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'RAW-REPLAY.json'),JSON.stringify(report,null,2));
await fs.writeFile(path.join(out,'REPLAY-SUMMARY.md'),'# Nonbillable capability replay\n\n14 controlled tool/state cases; zero model calls and zero external requests. Full raw inputs, fixtures, expected behavior, state, service traces and outcomes are in RAW-REPLAY.json. No composed answers or language-quality score is claimed.\n\n| Case | Legacy status | Candidate status |\n|---|---|---|\n'+results.map(r=>'| '+r.id+' | '+r.legacy.raw.status+' | '+r.candidate.raw.status+' |').join('\n')+'\n');
console.log(JSON.stringify({cases:results.length,modelCalls:0,costUsd:0,statuses:results.map(r=>({id:r.id,legacy:r.legacy.raw.status,candidate:r.candidate.raw.status}))},null,2));
