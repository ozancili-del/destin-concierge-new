import {CAR_RENTAL_URLS} from './vendor/business.mjs';
import {hash,requireContract} from './kernel.mjs';
// No client construction, credentials, guest records or network calls at import.
// Side effects are default denied; a reviewed server adapter must grant capabilities.
export function domainAdapters(services,{capabilities={},sessionId='synthetic-local',authorizedBooking=null,knowledgeScope=null}={}) {
  const invoke=async(name,...args)=>{requireContract(typeof services[name]==='function','service_unavailable');return services[name](...args);};
  const receipt=(input,name)=>hash({revision:input.revision,outcome:input.outcome,turn:input.turn,name,sessionId});
  // These existing typed guide slots select HQ link records, not fixed URLs or
  // evidence paths for prose. Ordinary package answers need no guide tool.
  const hqUrls=(...factIds)=>(knowledgeScope?.links()??[]).filter(l=>factIds.includes(l.factId)&&l.type==='web').map(l=>l.url);
  async function deliver(input,name,service,args,success) {
    requireContract(capabilities[name]===true,'action_not_authorized');
    const id=receipt(input,name), result=await invoke(service,...args,{idempotencyKey:id});
    return {status:success(result)?'success':'unavailable',data:{delivered:success(result)},receiptId:success(result)?id:null,links:[]};
  }
  return {
    async get_guide_link({outcome}) {
      // Property descriptions/pages come from the same loaded HQ packages as
      // the answer. A legacy booking base is not a public-page fallback.
      const photos=(knowledgeScope?.packages()??[]).filter(p=>p.topic.startsWith('unit-')).flatMap(p=>p.publicLinks.filter(l=>l.type==='web').map(l=>l.url));
      const options={car:[CAR_RENTAL_URLS.booking],itinerary:hqUrls('itinerary_planner_owner'),sunbird:hqUrls('snowbird_page_owner'),photos:[...new Set([...hqUrls('resort_virtual_tour_owner'),...photos])]};
      const urls=options[outcome.details.guide_topic];requireContract(urls,'guide_topic_required');
      return {status:urls.length?'success':'unavailable',data:{topic:outcome.details.guide_topic,liveInventoryChecked:false,...(!urls.length?{reason:'Load the relevant public-page HQ packages.'}:{})},links:urls.map(url=>({url}))};
    },
    async get_beach_conditions() {
      const raw=await invoke('fetchBeachConditions'),data={checkedAt:raw.checkedAt||null};
      for(const key of ['flag','surf','alerts'])if(raw[key]?.status==='success')data[key]=raw[key];
      const verified=Object.keys(data).filter(k=>k!=='checkedAt');
      return {status:verified.length?(verified.length===3?'success':'partial'):'unavailable',data:{...data,unverifiedComponents:['flag','surf','alerts'].filter(k=>!verified.includes(k))},links:verified.map(k=>data[k].source).filter(Boolean).map(url=>({url}))};
    },
    async get_beach_deals({outcome}) {
      requireContract(outcome.dates?.status==='resolved','needs_weather_period');
      const raw=await invoke('fetchBeachDeals',{arrival:outcome.dates.start,departure:outcome.dates.end,month:null,unit:null,limit:3});
      return {status:raw.status==='success'?'success':'unavailable',data:{...raw,availabilityEstablished:false},links:raw.status==='success'?hqUrls('canonical_deals_page_owner').map(url=>({url})):[]};
    },
    async search_current_events({outcome,clock}) {
      const raw=await invoke('searchCurrentEvents',{category:outcome.details.event_category,query:outcome.details.query,period:outcome.dates,clock});
      return {status:raw.status==='success'?'success':'unavailable',data:{facts:raw.facts||[],period:outcome.dates,checkedAt:raw.checkedAt||null},links:(raw.sources||[]).map(s=>({url:s.url}))};
    },
    request_owner_chat:input=>deliver(input,'owner_chat','sendOwnerChatInvite',[sessionId,input.outcome.action_evidence],r=>r.sent===true),
    relay_owner_message:input=>deliver(input,'relay','sendEmergencyDiscord',[input.outcome.details.message,sessionId,'Guest-requested owner message','message',[]],r=>r.sent===true),
    create_maintenance_alert:input=>{
      requireContract(['maintenance','emergency'].includes(input.outcome.details.severity),'severity_required');
      return deliver(input,'maintenance','sendEmergencyDiscord',[input.outcome.action_evidence,sessionId,input.outcome.details.message,input.outcome.details.severity,[]],r=>r.sent===true);
    },
    capture_lead:input=>deliver(input,'lead','addBrevoContact',[input.outcome.details.email,input.outcome.details.first_name||''],r=>r.captured===true),
    async get_existing_booking(){requireContract(capabilities.existing_booking===true&&authorizedBooking,'booking_not_authorized');return {status:'success',data:structuredClone(authorizedBooking),links:[]};}
  };
}
