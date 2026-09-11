export const ownerRules={
 id:'four-omitted-record-resolutions-20260909',
 authority:'Explicit owner decisions forwarded from task 01a05cd2-ebd3-7dd2-87ca-cc1271421945',
 status:'Applied to local experimental candidate only; no paid execution or deployment authorized',
 rules:[
  {id:'unknown-entity-search',sourceFactId:'restaurant_runtime_unknown_confirm_first',home:'Brain instructions and two-stage typed search-consent contract',instruction:'If something is not in HQ, briefly and playfully say it is not currently in your knowledge. Offer a targeted online search that may take up to about 20 seconds, and wait for explicit guest confirmation before searching. Do not over-explain. An offer is not confirmation. Use the search offer tool to remember the exact pending subject; search only after a later explicit confirmation. If the search service is unavailable, say so briefly and do not invent results.'},
  {id:'marketplace-changes',sourceFactId:'third_party_change_route',home:'booking_third_party HQ package and Brain capability boundary',fact:'For changes or cancellations to a marketplace reservation, contact the platform through which the reservation was booked. Destiny cannot access or modify the reservation.',instruction:'Regardless of marketplace, direct reservation changes or cancellations to the platform through which the guest booked. Do not refer them to Ozan by default. Do not claim access or modification capability.'},
  {id:'baby-equipment',sourceFactId:'family_travel_critical_items_owned_guide_2',home:'family_travel_critical_items HQ package; existing Pack ’n Play facts and rules remain in their packages',fact:'The Pack ’n Play is the only baby equipment listed as provided, subject to its existing HQ rules. Baby equipment not listed in HQ is not provided.',instruction:'Use the existing Pack ’n Play rules from HQ. Other baby equipment not listed is not provided. For a specific requirement, briefly suggest emailing Ozan, then stop; do not prolong the discussion or imply the request is approved.'},
  {id:'weather-evidence',sourceFactId:'rain_no_entertainment_drive',home:'Brain weather-evidence policy and typed weather request/result contract',instruction:'You have zero ambient or current-weather awareness by default. Never volunteer current weather in greetings or ordinary conversation. A casual “What’s up?” supplies no weather evidence. Current weather or danger exists for you only when the guest asks and a successful live weather or official-alert tool explicitly returns it, or when the guest explicitly states the condition. Failed, unknown or empty tool output proves nothing. Ordinary rain does not imply danger. Only when dangerous conditions are explicitly established should you avoid encouraging unnecessary entertainment driving. Apply the same evidence discipline to beach conditions. Previous weather results are not ambient awareness and must not be volunteered in a new unrelated turn.'}
 ]
};

export function normalizeConversationState(state){
 const pending=state?.concierge?.pendingSearch;
 return {turn:Number.isInteger(state?.concierge?.turn)?state.concierge.turn:0,pendingSearch:pending&&typeof pending.id==='string'&&typeof pending.query==='string'?structuredClone(pending):null};
}
export async function executeSearchContract(name,args,{concierge,latestUser,services,makeId}){
 if(name==='offer_targeted_search'){
  if(!args.entity?.trim()||!args.query?.trim())return {ok:false,status:'missing_search_subject',data:{searched:false}};
  const pending={id:makeId({query:args.query,entity:args.entity,turn:concierge.turn}),entity:args.entity,query:args.query,offeredTurn:concierge.turn};
  concierge.pendingSearch=pending;
  return {ok:true,status:'awaiting_guest_confirmation',data:{offerId:pending.id,entity:pending.entity,estimatedSeconds:20,searched:false}};
 }
 const p=concierge.pendingSearch;
 if(!p||p.id!==args.offer_id||p.offeredTurn>=concierge.turn)return {ok:false,status:'confirmation_required',data:{searched:false}};
 if(args.consent!=='confirmed'||!args.confirmation_quote?.trim()||!latestUser.includes(args.confirmation_quote))return {ok:false,status:'confirmation_required',data:{searched:false}};
 // Semantics of confirmation belong to the shared model. Code requires a prior
 // persisted offer, an exact current-turn quote, and a single-use scope binding.
 concierge.pendingSearch=null;
 if(typeof services.searchUnknownEntity!=='function')return {ok:false,status:'search_unavailable',data:{searched:false}};
 try{const r=await services.searchUnknownEntity({entity:p.entity,query:p.query,timeoutMs:20000});
  if(r?.status!=='success'||!Array.isArray(r.facts)||!r.facts.length||!r.sources?.length)return {ok:false,status:'search_unavailable',data:{searched:true},facts:[]};
  return {ok:true,status:'success',data:{entity:p.entity,query:p.query,checkedAt:r.checkedAt,sources:r.sources},facts:r.facts,urls:r.sources.map(s=>s.url)};
 }catch{return {ok:false,status:'search_unavailable',data:{searched:true},facts:[]};}
}
