import { executeTool, mergeToolPatch } from '../destiny-agent/orchestrator.js';
import { normalizeState, CAR_RENTAL_URLS, BLOG_URLS, STATIC_URLS, UNITS, buildBookingLink, validateDateRange, validateParty } from '../destiny-agent/business.js';
import { searchArtifact, renderKnowledge } from './retrieve.js';
import { authorizeAction, POLICY_VERSION } from './policy.js';
import { validateProposal } from './semantic.js';
import { digest } from './artifact.js';

const ARGUMENTS=new Set(['date_text','date_confidence','arrival','departure','target_arrival','target_departure','target_date_text','adults','children','total_guests','adults_evidence','children_evidence','total_guests_evidence','party_scope','party_evidence','preferred_unit','bedrooms_requested','bedrooms_evidence','holiday_name','holiday_evidence','flexibility_days','date_role','origin_text','destination_iata','departure_date','return_date','infants','category','start_date','end_date','topic','query','date_context','location_context','month','flexibility_scope','message','description','reason','email','first_name']);
const emptyAnswer=text=>({text,caveats:[],links:[],factIds:[]});
function invalidateChangedLinks(previous,next){
  const dates=['arrival','departure'].some(k=>previous.booking[k]!==next.booking[k]);
  const party=['adults','children','totalGuests'].some(k=>previous.booking[k]!==next.booking[k]);
  const unit=previous.booking.preferredUnit!==next.booking.preferredUnit;
  if(dates||party||unit){next.verified.bookingUrls=[];next.verified.availabilityCheckedAt=null;next.verified.availabilityQuery=null;next.verified.availabilityUnits={'707':null,'1006':null};}
  if(dates||party){next.verified.flightUrls=[];next.verified.flightQuery=null;if(party){next.flight.adults=null;next.flight.children=null;}}
  if(dates){next.verified.activityUrls=[];next.verified.activityQuery=null;}
  return next;
}
function toolStatus(r){
  if(r.status==='partial_failure'||r.status==='check_failed'||r.status==='unknown')return 'unavailable';
  if(r.status?.startsWith('needs_')||r.status?.includes('invalid')||r.status?.includes('occupancy')||r.status?.includes('hoa'))return 'clarify';
  if(!r.ok)return 'unavailable';
  if(r.status==='partial')return 'partial';
  return 'complete';
}
function permittedLink(value,cited=new Set()){
  try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!/null|undefined|PLACEHOLDER/.test(u.href)&&!/^\[|^[\d.]+$|(^|\.)(localhost|local|internal)$/.test(u.hostname)&&(['www.destincondogetaways.com','destincondogetaways.com','www.mypelicanbeach.com','mypelicanbeach.com','www.discovercars.com','www.aviasales.com','www.tripshock.com','api.weather.gov','www.destinfire.gov','www.bandsintown.com'].includes(u.hostname)||cited.has(value));}catch{return false;}
}
export async function bookingReceipt(r,{services,now}){
  const q=r.data?.query;
  const units=r.data?.units||[];
  const complete=units.length===2&&units.every(u=>typeof u.available==='boolean');
  const links=[];
  if(complete&&validateDateRange(q,now).ok&&validateParty(q.adults,q.children).ok){
    const needBoth=r.data.needsTwoUnits===true;
    for(const u of units)if(u.available===true&&(!needBoth||units.every(x=>x.available===true))){
      const url=buildBookingLink(u.unit,q.arrival,q.departure,u.adults??q.adults,u.children??q.children);
      if(url===u.bookingUrl)links.push(url);
    }
  }
  // Partial calendar windows are suggestions until freshly verified for the
  // exact alternative. Unknown results cannot inherit a builder-only URL.
  for(const a of r.data?.alternatives||[]){
    if(!q||!validateDateRange(a,now).ok)continue;
    const available=await services.checkBothUnits(a.arrival,a.departure).catch(()=>({'707':null,'1006':null}));
    if(['707','1006'].every(id=>typeof available[id]==='boolean')&&available[a.unit]===true){
      const url=buildBookingLink(a.unit,a.arrival,a.departure,q.adults,q.children);if(url===a.bookingUrl)links.push(url);
    }
  }
  return links;
}
function toolAnswer(r,route,links,business){
  if(route==='find_open_windows')return {...emptyAnswer((r.data?.options||[]).map(o=>`Freshly checked: ${o.arrival} through ${o.departure}, ${o.links.map(l=>`Unit ${l.unit}: ${l.adults} adults and ${l.children} children`).join('; ')}.`).join(' ')||'I couldn’t verify a complete alternative stay. Please try a fresh check.'),links};
  if(route==='get_beach_conditions'){
    const d=r.data||{},caveat='Conditions can change quickly. Follow posted flags and lifeguard instructions; this report does not guarantee safe swimming.';
    const lines=[d.flag?.status==='success'?`The posted beach flag is ${d.flag.value}.`:'The posted beach flag could not be verified.',d.surf?.status==='success'?`The surf forecast issued ${d.surf.issuedAt||'at an unspecified time'} reports rip-current risk ${d.surf.ripCurrentRisk||'not provided'}; surf ${d.surf.surfHeight||'not provided'}.`:'The surf forecast could not be verified.',...(d.alerts?.items||[]).map(a=>`${a.event}: ${a.headline||''}${a.expires?` Expires ${a.expires}.`:''}`),`Checked ${d.checkedAt||'time unavailable'}.`,caveat];
    return {...emptyAnswer(lines.join(' ')),caveats:[caveat],links};
  }
  if(route==='get_beach_deals'){
    const d=r.data||{},caveat='These are published price reductions. Availability needs a fresh check for your dates and party.';
    return {...emptyAnswer([...(d.deals||[]).map(x=>`Unit ${x.unit}, ${x.arrival} through ${x.departure}: ${x.dropPct}% reduction from ${x.fromPrice} to ${x.toPrice} average nightly before fees and taxes.`),...(d.deals?.length?[]:['No matching current reduction was returned.']),caveat].join(' ')),caveats:[caveat],links};
  }
  if(route==='check_availability'){
    const q=r.data?.query;
    if(r.data?.partyValidation?.code==='hoa_violation')return emptyAnswer('The resort requires at least one adult for every three children. Please update the party details; I have not checked availability or created a booking link.');
    if(r.status==='occupancy_exceeded')return emptyAnswer('Each condo can accommodate at most six people, including infants. Both condos together accommodate at most twelve. Please clarify the party details.');
    if(!q?.arrival||!q?.departure||q.adults==null||q.children==null)return emptyAnswer('Please share the missing check-in, check-out, adult and child details so I can check availability.');
    if(!r.data?.units?.every(u=>typeof u.available==='boolean'))return emptyAnswer('I couldn’t verify complete availability for those dates. Please try a fresh check.');
    const units=r.data.units.map(u=>`Unit ${u.unit} is ${u.available?'available':'booked'}`).join('; ');
    const drops=(r.data.priceDrops||[]).filter(d=>['707','1006'].includes(String(d.unit))&&[d.dropPct,d.windowDays,d.fromPrice,d.toPrice].every(Number.isFinite)).map(d=>`Unit ${d.unit}'s average nightly price before fees and taxes dropped ${d.dropPct}% over ${d.windowDays} days, from $${d.fromPrice} to $${d.toPrice}.`).join(' ');
    const assumptions=[r.data.holidayStay?`I used a four-night stay around ${r.data.holidayStay.holiday} as an assumption; tell me if you want different dates.`:'',r.data.assumedChildrenZero?'I used zero children because none were mentioned. Infants count toward the guest limit.':'',business?.flags?.bedroomMismatch?'Both listings are one-bedroom condos; they do not match a request for two or more bedrooms in one condo.':''].filter(Boolean);
    const split=r.data.needsTwoUnits?`Both condos are required. Suggested split: ${r.data.units.map(u=>`Unit ${u.unit}: ${u.adults} adults and ${u.children} children`).join('; ')}.`:'';
    const alternatives=(r.data.alternatives||[]).filter(a=>links.includes(a.bookingUrl)).map(a=>`A freshly checked alternative is Unit ${a.unit}, ${a.arrival} through ${a.departure}.`).join(' ');
    return {...emptyAnswer(`For ${q.arrival} through ${q.departure}, ${q.adults} adults and ${q.children} children: ${units}. ${split} ${drops} ${alternatives} ${assumptions.join(' ')} Please review the guest counts on the secure booking page, or reply with changes for a fresh check.`),caveats:assumptions,links};
  }
  if(route==='build_flight_search'&&r.status==='success'){
    const d=r.data;return {...emptyAnswer(`From ${d.origin} to ${d.destination}, ${d.departureDate} through ${d.returnDate}, for ${d.adults} adults, ${d.children} children and ${d.infants} infants.${d.assumedFromStay?' I used your confirmed condo dates.':d.differsFromStay?` These flight dates differ from your condo stay ${d.condoDates.arrival} through ${d.condoDates.departure}.`:''} Open the search link to check current fares, schedules and seats.`),links};
  }
  if(route==='get_activity_options'&&r.ok)return {...emptyAnswer(`Open the ${r.data.category} activity link to check current prices, times and availability.${r.data.dates?` I used ${r.data.dates.arrival} through ${r.data.dates.departure}.`:''}`),links};
  if(route==='get_offer_inquiry')return {...emptyAnswer('Use the inquiry page to send Ozan your dates, party details and proposed rate for review. An inquiry does not guarantee acceptance, a discount or a response time.'),links};
  const cleanFacts=(r.facts||[]).filter(f=>typeof f==='string'&&!/\b(?:Tell the guest|You must|State this|Do not|Never|Guest-facing|Booking details stored)/i.test(f));
  return {...emptyAnswer(cleanFacts.slice(0,3).join(' ')|| (toolStatus(r)==='clarify'?`Please share ${r.data?.missing?.join(', ')||'the missing details'}.`:'That request could not be completed.')),links};
}

export async function executeTurn({text,history=[],session,artifact,interpreter,services,scopedOpenAI,authority,traceId,turnId,now=new Date(),signal,revokedFactIds=new Set()}){
  if(!traceId||!turnId||!session||session.revision!==digest(artifact))throw new Error('runtime_context_invalid');
  const started=performance.now();
  const serviceCalls={},citedUrls=new Set();let scopedModelCalls=0;
  const rawServices=services;
  services=new Proxy(rawServices||{}, {get(target,name){
    if(name==='fetchPublishedKnowledge')throw new Error('request_time_publication_fetch_forbidden');
    const fn=Reflect.get(target,name);if(typeof fn!=='function')return fn;
    return (...args)=>{
      if(signal?.aborted)throw new Error('turn_cancelled');serviceCalls[name]=(serviceCalls[name]||0)+1;
      const checked=r=>{if(signal?.aborted)throw new Error('turn_cancelled');return name==='verifyGuestLinkSignature'&&r?.legacy?{ok:false,reason:'signed_guest_link_required'}:r;};
      const r=fn.apply(target,args);return r&&typeof r.then==='function'?r.then(checked):checked(r);
    };
  }});
  const modelClient=scopedOpenAI;
  if(modelClient?.responses?.create)scopedOpenAI={responses:{async create(...args){
    if(signal?.aborted)throw new Error('turn_cancelled');scopedModelCalls++;
    const r=await modelClient.responses.create(...args);
    for(const o of r.output||[])for(const c of o.content||[])for(const a of c.annotations||[]){const url=a.url||a.url_citation?.url;if(url)citedUrls.add(url);}
    return r;
  }}};
  const allowLink=url=>permittedLink(url,citedUrls);
  // Interpreter sees no protected booking records, signatures, provider tokens,
  // old URL capabilities or operational session data.
  const semanticState={booking:session.business?.booking,flight:session.business?.flight,category:session.category,offeredEntityIds:session.offeredEntityIds,expectedReply:session.expectedReply,pendingSearch:session.pendingSearch};
  const interpreted=await interpreter({text,history,state:semanticState,pageContext:session.pageContext,artifact,now:new Date(now).toISOString(),signal});
  const proposal=validateProposal(interpreted.proposal,{text,artifact});
  const outcomes=[];let business=normalizeState(session.business),category=session.category||null,offered=[...(session.offeredEntityIds||[])],pendingSearch=session.pendingSearch||null;
  const executed=new Map();
  for(const [index,action] of proposal.actions.entries()){
    if(signal?.aborted)throw new Error('turn_cancelled');
    const subrequestId=`${turnId}:${index+1}`,rule=authorizeAction(action,authority),begin=performance.now();
    let status='complete',answer=emptyAnswer(''),candidateIds=[],unresolved=[],checkedAt=null;
    const args=JSON.parse(action.argsJson);
    if(Object.keys(args).some(k=>!ARGUMENTS.has(k)))throw new Error('tool_argument_not_allowed');
    if(rule.route==='knowledge'){
      const result=searchArtifact(artifact,action,{category,offeredEntityIds:offered},{now,revokedFactIds});
      status=result.status;unresolved=result.unresolved;candidateIds=result.candidates.map(e=>e.id);answer=renderKnowledge(result,{channel:authority.channel,holiday:action.holiday});
      if(action.intent==='recommendations'){
        if(category!==result.category)offered=[];category=result.category;offered=[...new Set([...offered,...candidateIds])];
      }
    }else if(rule.route==='denied'){
      status='denied';unresolved=[rule.reason];answer=emptyAnswer('I can help check availability and provide booking links. For private reservation access, changes, cancellations or payment help, please use the secure owner contact route.');
    }else if(rule.route==='refer'){
      const result=searchArtifact(artifact,{...action,intent:'stable_fact'},{category,offeredEntityIds:offered},{now,revokedFactIds});
      candidateIds=result.candidates.map(e=>e.id);answer=emptyAnswer('Please confirm that directly with the responsible business; I can’t verify or guarantee that outcome.');
      answer.factIds=result.factIds;
    }else if(rule.route==='consent'){
      if(action.intent==='search_consent'&&(!pendingSearch||new Date(now)-new Date(pendingSearch.requestedAt)>600000||!action.evidence.trim())){
        pendingSearch=null;status='clarify';unresolved=['search_context'];answer=emptyAnswer('Which business would you like me to look up?');
      }else if(action.intent==='unlisted_search'){
        pendingSearch={query:action.query,requestedAt:new Date(now).toISOString()};status='clarify';unresolved=['search_consent'];answer=emptyAnswer('That business isn’t in my approved guide. An online search can take about 20 seconds. Would you like me to search?');
      }else if(typeof services.searchUnlistedVenue==='function'){
        const r=await services.searchUnlistedVenue(pendingSearch.query,{signal});pendingSearch=null;status=r.status==='success'?'complete':'unavailable';answer=emptyAnswer(r.summary||'The search did not complete.');for(const url of r.citationUrls||[])citedUrls.add(url);answer.links=(r.urls||[]).filter(allowLink);checkedAt=r.checkedAt||null;
      }else{status='unavailable';answer=emptyAnswer('Online search is unavailable in this private session.');}
    }else if(rule.route==='car_link'){
      answer={...emptyAnswer('Compare rental cars through DiscoverCars and enter your pickup details there to check current vehicles and prices.'),links:[CAR_RENTAL_URLS.booking,CAR_RENTAL_URLS.guide].filter(Boolean)};
    }else if(rule.route==='guide_link'){
      const urls=args.topic==='photos'?[STATIC_URLS.virtualTour,UNITS['707'].bookingBase,UNITS['1006'].bookingBase,STATIC_URLS.reviews]:[args.topic==='itinerary'?STATIC_URLS.tripPlanner:STATIC_URLS[args.topic]||BLOG_URLS[args.topic]].filter(Boolean);
      if(urls.length)answer={...emptyAnswer(args.topic==='itinerary'?'Use the itinerary planner to organize your trip.':args.topic==='sunbird'?'Explore the Sunbird page for winter and extended stays.':'Here is the relevant guide.'),links:urls};else{status='clarify';answer=emptyAnswer('Which guide would you like?');unresolved=['guide_topic'];}
    }else if(rule.route==='conversational')answer=emptyAnswer('What would you like to know about your stay or Destin?');
    else if(rule.route==='clarify'){status='clarify';answer=emptyAnswer('Could you clarify the detail you mean?');unresolved=action.fields;}
    else if(rule.route==='emergency')answer=emptyAnswer('For immediate danger or a medical emergency, call 911. Contact resort security for urgent on-site assistance.');
    else {
      const key=digest({route:rule.route,args,business:business.booking});
      let r=executed.get(key);
      if(!r){
        r=await executeTool(rule.route,args,{services,openai:scopedOpenAI,state:business,latestUser:text,messages:history,now:new Date(now),sessionId:session.id,pageSource:session.pageContext?.source,sawBanner:authority.leadEligible===true,guestBid:authority.guestBid||null,guestSig:authority.guestSig||null,logger:{log(){},error(){}}});
        executed.set(key,r);
      }
      if(r.statePatch){const next=mergeToolPatch(business,r.statePatch);business=rule.route==='remember_booking_details'?invalidateChangedLinks(business,next):next;}
      status=toolStatus(r);checkedAt=r.data?.checkedAt||null;
      let links=(r.urls||[]).filter(allowLink);
      if(rule.route==='check_availability'){
        links=await bookingReceipt(r,{services,now});business.verified.bookingUrls=links;
      }
      if(rule.route==='find_open_windows'){
        links=[];
        for(const option of r.data?.options||[]){
          const fresh=await services.checkBothUnits(option.arrival,option.departure).catch(()=>({'707':null,'1006':null}));
          if(!['707','1006'].every(u=>typeof fresh[u]==='boolean'))continue;
          if((business.booking.adults||0)+(business.booking.children||0)>6&&!['707','1006'].every(u=>fresh[u]))continue;
          for(const link of option.links||[])if(fresh[link.unit]===true&&link.url===buildBookingLink(link.unit,option.arrival,option.departure,link.adults??business.booking.adults,link.children??business.booking.children))links.push(link.url);
        }
        business.verified.bookingUrls=links;
        const options=(r.data?.options||[]).map(o=>({...o,links:(o.links||[]).filter(l=>links.includes(l.url)).map(l=>({...l,adults:l.adults??business.booking.adults,children:l.children??business.booking.children}))})).filter(o=>o.links.length);
        r={...r,data:{...r.data,options},status:options.length?'success':'unavailable',ok:options.length>0};status=toolStatus(r);
      }
      answer=rule.route==='remember_booking_details'?emptyAnswer(''):toolAnswer(r,rule.route,links,business);
      if(status!=='complete')unresolved=r.data?.missing||[r.status||'provider_result'];
    }
    answer.links=answer.links.filter(allowLink);
    outcomes.push({subrequestId,intent:action.intent,status,requestedRoute:rule.route,executedRoute:rule.route,revision:session.revision,candidateIds,factIds:answer.factIds,answer,checkedAt,unresolved,elapsedMs:performance.now()-begin});
  }
  if(signal?.aborted)throw new Error('turn_cancelled');
  const status=outcomes.every(o=>o.status==='complete')?'complete':outcomes.some(o=>o.status==='complete'||o.status==='partial')?'partial':outcomes[0]?.status||'error';
  const reply=outcomes.map(o=>o.answer.text).filter(Boolean).join(authority.channel==='voice'?' ':'\n\n');
  const result={version:1,traceId,turnId,status,revision:session.revision,policyVersion:POLICY_VERSION,outcomes,reply,links:[...new Set(outcomes.flatMap(o=>o.answer.links))],interpretation:interpreted.evidence,trace:{interpreterCalls:1,scopedToolCalls:executed.size,serviceCalls,scopedModelCalls,githubReads:0,fullAgentCalls:0,elapsedMs:performance.now()-started}};
  return {result,session:{...session,version:session.version+1,business,category,offeredEntityIds:offered,pendingSearch,locale:proposal.locale,history:[...history,{role:'user',content:text},{role:'assistant',content:reply}].slice(-24)}};
}
