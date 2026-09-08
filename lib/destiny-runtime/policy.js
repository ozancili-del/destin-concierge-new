import { freeze } from './artifact.js';

export const POLICY_VERSION='destiny-runtime-policy-1';
const RULES={
  stable_fact:['knowledge','knowledge.read'],recommendations:['knowledge','knowledge.read'],
  merchant_outcome:['refer','none'],unlisted_search:['consent','search.read'],search_consent:['consent','search.read'],
  availability:['check_availability','availability.read'],booking_link:['check_availability','availability.read'],flexible_windows:['find_open_windows','availability.read'],
  flight_link:['build_flight_search','links.read'],activity_link:['get_activity_options','links.read'],car_link:['car_link','links.read'],guide_link:['guide_link','links.read'],
  weather:['get_destin_weather','weather.read'],beach_conditions:['get_beach_conditions','safety.read'],events:['search_current_events','events.read'],
  offer_inquiry:['get_offer_inquiry','links.read'],beach_deals:['get_beach_deals','deals.read'],remember_trip:['remember_booking_details','state.write'],
  existing_guest:['get_existing_booking','guest.read'],reservation_change:['denied','none'],maintenance:['create_maintenance_alert','maintenance.send'],owner_relay:['relay_owner_message','owner.send'],lead_capture:['capture_lead','lead.write'],
  emergency:['emergency','none'],conversational:['conversational','none'],clarify:['clarify','none'],
};
const PUBLIC=['none','knowledge.read','availability.read','links.read','weather.read','safety.read','events.read','deals.read','state.write','search.read'];
export function authorizeAction(action, authority) {
  if(!authority||!['chat','voice'].includes(authority.channel))throw new Error('server_authority_required');
  const rule=RULES[action.intent];if(!rule)throw new Error('unknown_intent');
  const [route,capability]=rule;
  const allowed=new Set(PUBLIC);
  // Grants originate only in authenticated server session construction, never
  // from caller channel hints, interpreter arguments or client router plans.
  for(const grant of authority.grants||[])if(['guest.read','maintenance.send','owner.send','lead.write'].includes(grant))allowed.add(grant);
  if(capability==='guest.read'&&!authority.verifiedGuest) return freeze({route:'denied',capability:'none',reason:'verified_guest_required'});
  if(!allowed.has(capability))return freeze({route:'denied',capability:'none',reason:'capability_not_granted'});
  return freeze({route,capability,reason:route==='denied'?'unsupported_reservation_action':'allowed'});
}
export function normalizePageContext(value={}) {
  const source=typeof value.source==='string'?value.source.slice(0,80):null;
  let pathname=null;
  if(typeof value.url==='string'){
    try{const u=new URL(value.url,'https://www.destincondogetaways.com');if(['www.destincondogetaways.com','destincondogetaways.com','www.mypelicanbeach.com','mypelicanbeach.com'].includes(u.hostname)&&u.protocol==='https:'&&!u.username&&!u.password)pathname=u.pathname;}catch{}
  }
  return {source,path:pathname,unit:['707','1006'].includes(String(value.unit))?String(value.unit):null};
}
