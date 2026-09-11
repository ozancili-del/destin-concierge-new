import {executeTool} from '../destiny-agent/orchestrator.js';
import {STATIC_URLS,CAR_RENTAL_URLS,TRIPSHOCK_CATEGORIES,buildFlightLink,extractOrigin,createDefaultState} from '../destiny-agent/business.js';
import {authorizeAction} from './policy.js';
import {bookingTransaction,guestDate,guestParty} from './booking-transaction.js';
import {fieldEvidence,guestSentences} from './guest-evidence.js';

const intents={booking:'availability',weather:'weather',beach:'beach_conditions',car:'car_link',flight:'flight_link',activity:'activity_link',guide:'guide_link',referral:'merchant_outcome',optional_search:'unlisted_search',deals:'beach_deals',offer:'offer_inquiry',events:'events'};
const atom=(id,text,extra={})=>fieldEvidence(id,id,'verified',null,text,{kind:'action',...extra});
const link=(id,url,label)=>({id,url,label,required:true});
const getStatus=x=>x?.status==='success'||x?.status==='complete'?'verified':x?.status==='unavailable'?'unavailable':'unknown';

export async function executeDomainAction(action,{state,session,services,authority,now,signal,text,history,evidence:contextEvidence=[]}){
 const started=performance.now(),kind=action.type,intent=intents[kind];
 if(!intent||authorizeAction({intent},{...authority,channel:'chat'}).route==='denied')return {type:kind,status:'denied',completed:false,evidence:[atom('denied','That action is not available in this private review.')],links:[],elapsedMs:performance.now()-started};
 let result={type:kind,status:'complete',completed:true,evidence:[],links:[]};
 const checkedAt=now.toISOString();
 if(kind==='booking')result={...result,...await bookingTransaction(state,action,{services,now,signal})};
 else if(kind==='weather'){
  let data;try{data=await services.fetchDestinWeather();}catch{data={status:'unavailable'};}
  const status=getStatus(data);result.fields={forecast:{status,value:status==='verified'?data.forecast:null,checkedAt:data.checkedAt||checkedAt},beachClosure:{status:'not_checked',value:null}};
  result.evidence=(data.forecast||[]).map((d,i)=>{const hi=Number.isFinite(d.hi)?`high ${d.hi}°F`:'high temperature unknown',lo=Number.isFinite(d.lo)?`low ${d.lo}°F`:'low temperature unknown',rain=Number.isFinite(d.rain)?`${d.rain<1?d.rain*100:d.rain}% chance of rain`:'rain probability unknown';return fieldEvidence(`weather.${i}`,'forecast',status,{date:d.date,high:{status:Number.isFinite(d.hi)?'verified':'unknown',value:d.hi??null},low:{status:Number.isFinite(d.lo)?'verified':'unknown',value:d.lo??null},rain:{status:Number.isFinite(d.rain)?'verified':'unknown',value:d.rain??null}},`${d.date}: ${d.desc||'forecast available'}, ${hi}, ${lo}, ${rain}.`,{checkedAt:data.checkedAt||checkedAt,source:data.source||STATIC_URLS.weatherLive});});
  if(!result.evidence.length)result.evidence=[fieldEvidence('weather.unknown','forecast',status,null,'The current forecast could not be verified.',{checkedAt})];
  result.status=status==='verified'?'complete':'partial';result.completed=status==='verified';
 }else if(kind==='beach'){
  let data;try{data=await services.fetchBeachConditions();}catch{data={status:'unavailable'};}
  result.fields={flag:{status:getStatus(data.flag),value:data.flag?.value||null},ripCurrent:{status:getStatus(data.surf),value:data.surf?.ripCurrentRisk||null},surf:{status:getStatus(data.surf),value:data.surf?.surfHeight||null},alerts:{status:getStatus(data.alerts),value:data.alerts?.items||null},beachClosure:{status:'not_checked',value:null}};
  const definitions=[['flag','beach.flag',data.flag?.value?`The posted beach flag is ${data.flag.value}.`:'The beach flag could not be verified.',data.flag],['ripCurrent','beach.rip',data.surf?.ripCurrentRisk?`The reported rip-current risk is ${String(data.surf.ripCurrentRisk).replace(/[.]$/,'')}.`:'Rip-current risk could not be verified.',data.surf],['surf','beach.surf',data.surf?.surfHeight?`Reported surf is ${String(data.surf.surfHeight).replace(/[.]$/,'')}.`:'Surf height could not be verified.',data.surf],['alerts','beach.alerts',data.alerts?.status==='success'?(data.alerts.items?.length?`The coastal alerts include ${data.alerts.items.map(x=>x.event||x.headline).join('; ')}.`:'The coastal-alert source returned no active alerts.'):'Coastal alerts could not be verified.',data.alerts]];
  result.evidence=definitions.map(([f,id,sentence,source])=>fieldEvidence(id,f,result.fields[f].status,result.fields[f].value,sentence,{source:source?.source,checkedAt:data.checkedAt||checkedAt,kind:'safety'}));
  result.evidence.push(fieldEvidence('beach.closure','beachClosure','not_checked',null,'Beach-closure status has not been checked.',{kind:'safety',checkedAt}),atom('beach.caution','Conditions can change quickly; follow posted flags and lifeguard instructions.',{kind:'safety'}));
  result.status=data.status==='success'?'complete':'partial';result.completed=data.status==='success';
 }else if(kind==='car'){
  result.evidence=[atom('car.provider','Use DiscoverCars to check current vehicles, prices and pickup options; no inventory has been checked here.')];result.links=[link('car.link',CAR_RENTAL_URLS.booking,'Compare rental cars')];
 }else if(kind==='flight'){
  const arrival=action.arrival||state.flight?.departure||state.booking.arrival,departure=action.departure||state.flight?.returnDate||state.booking.departure,origin=extractOrigin(action.origin||'')||state.flight?.originIata;
  const a=action.adults??state.booking.adults??1,c=action.children??state.booking.children??0,i=action.infants??0;
  const url=buildFlightLink(origin,arrival,departure,a,c,i);
  if(url){result.links=[link('flight.link',url,'Search flights')];result.evidence=[atom('flight.scope',`Search flights from ${origin}, ${guestDate(arrival)} to ${guestDate(departure)}, for ${guestParty(a,c)}${i?` and ${i} ${i===1?'infant':'infants'}`:''}. Check current fares and seats with the provider.`)];result.flightPatch={originIata:origin,departure:arrival,returnDate:departure,adults:a,children:c,infants:i};}
  else{result.status='clarification';result.completed=false;result.evidence=[atom('flight.clarification',!origin?'Which city or airport will you fly from?':'What departure and return dates would you like?',{kind:'clarification'})];}
 }else if(kind==='guide'){
  const guides={itinerary:[STATIC_URLS.tripPlanner,'Destin Vacation Itinerary Planner','Use the Destin Vacation Itinerary Planner to plan a day-by-day stay.'],sunbird:[STATIC_URLS.sunbird,'Winter stays','The Sunbird page covers monthly and extended winter stays.'],photos:[STATIC_URLS.virtualTour,'Virtual tour','You can view the property in the virtual tour.']};
  const g=guides[action.topic];if(!g)throw new Error('invalid_guide');result.evidence=[atom(`guide.${action.topic}`,g[2])];result.links=[link(`guide.${action.topic}.link`,g[0],g[1])];
 }else if(kind==='referral'){
  const entity=contextEvidence.find(e=>e.entityId===action.entityId)?.entity||'the business';
  const needs={accessibility:`Please confirm your wheelchair-access requirements directly with ${entity}; I can’t guarantee that its facilities will meet your individual needs.`,parking:'I can’t guarantee a covered parking space. Please ask the resort front desk about current parking arrangements.',stock:`Please confirm current stock directly with ${entity}; it has not been checked here.`,opening:`Please confirm current operation directly with ${entity}; normal hours do not guarantee an unexpected opening or closure.`,general:`Please confirm that specific requirement directly with ${entity}; I can’t guarantee the outcome.`};
  const texts={reservation:'I can’t access or change private reservations here. Please contact the owner through your existing secure booking platform; don’t paste reservation details into this chat.',merchant:needs[action.need]||needs.general,emergency:'If there is immediate danger, call 911. No alert or message has been sent from this chat.'};result.evidence=[atom('referral.'+action.reason,texts[action.reason]||texts.merchant,{kind:'safety'})];
 }else if(kind==='optional_search'){
  if(action.decision==='decline'){result.pendingSearch=null;result.evidence=[atom('search.cancelled','I won’t run that search.')];}
  else if(action.decision==='offer'){result.pendingSearch={query:String(action.query||text).slice(0,300),requestedAt:checkedAt};result.evidence=[atom('search.offer','An optional online search takes about 20 seconds. Would you like me to proceed?',{kind:'clarification'})];result.status='consent_required';result.completed=false;}
  else if(!session.pendingSearch||now-new Date(session.pendingSearch.requestedAt)>600000){result.evidence=[atom('search.missing','What business would you like me to look up?',{kind:'clarification'})];result.status='clarification';result.completed=false;}
  else{const data=await services.searchUnlistedVenue?.(session.pendingSearch.query,{signal});result.pendingSearch=null;result.modelTrace=data?.modelTrace||null;result.sourceTraceLevel=data?.sourceTraceLevel||null;result.evidence=guestSentences(data?.summary||'').map((s,i)=>atom(`search.result.${i}`,s));result.links=(data?.urls||[]).filter(u=>/^https:\/\//.test(u)).map((u,i)=>link(`search.link.${i}`,u,'Source'));if(!result.evidence.length){result.status='unavailable';result.completed=false;result.evidence=[fieldEvidence('search.unknown','search','unavailable',null,'The lookup did not return verified information.',{checkedAt})];}}
 }else{
  const name={activity:'get_activity_options',deals:'get_beach_deals',offer:'get_offer_inquiry',events:'search_current_events'}[kind];
  const args=kind==='activity'?{category:action.category,start_date:action.arrival||state.booking.arrival,end_date:action.departure||state.booking.departure}:kind==='deals'?{month:action.month,flexibility_scope:action.flexibility}:kind==='events'?{query:action.query,category:'events'}:{};
  const ctx={state:state||createDefaultState(),services,latestUser:text,messages:history,now,sessionId:session.id,guestBid:null,guestSig:null,pageSource:session.pageContext?.source,logger:{log(){},error(){}}};
  if(kind==='events'&&!services.searchCurrentEvents){result.status='unavailable';result.completed=false;result.evidence=[fieldEvidence('events.unknown','events','unavailable',null,'Current events could not be checked.',{checkedAt})];}
  else{if(kind==='activity'&&!Object.hasOwn(TRIPSHOCK_CATEGORIES,action.category))return {...result,status:'clarification',completed:false,evidence:[atom('activity.unknown','Which activity would you like to explore?',{kind:'clarification'})]};const raw=kind==='events'?await services.searchCurrentEvents(args):await executeTool(name,args,ctx);result.status=raw.ok===false?'partial':'complete';result.completed=raw.ok!==false;result.evidence=(raw.facts||[]).flatMap(guestSentences).map((s,i)=>atom(`${kind}.${i}`,s));const activityLabel=kind==='activity'?(TRIPSHOCK_CATEGORIES[action.category].startsWith('@product:')?action.category:TRIPSHOCK_CATEGORIES[action.category].replace(/-/g,' ')):null;result.links=(raw.urls||[]).map((u,i)=>link(`${kind}.link.${i}`,u,kind==='activity'?`Check ${activityLabel}`:kind==='offer'?'Submit an offer':kind==='deals'?'View deals':'Event source'));result.receipt=raw.data||null;if(kind==='activity')result.evidence=[atom('activity.scope',`Use TripShock to check current ${activityLabel} times, prices and availability. No provider inventory has been checked here.`)];}
 }
 result.elapsedMs=performance.now()-started;return result;
}
