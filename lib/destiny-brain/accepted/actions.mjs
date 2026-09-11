import {canonicalUrl} from './links.mjs';
import {executeBooking} from './booking.mjs';
import {assertPayloadSafe} from './vendor/privacy.mjs';
import {buildBookingLink,buildFlightLink,buildTripShockLink,TRIPSHOCK_CATEGORIES} from './vendor/business.mjs';
import {hash,stable,ContractError,requireContract,providerParty,flightParty,eligibleUnit,validSplits,actionDates,daysBetween,transition,assertState} from './kernel.mjs';

// Browsing dates are not lodging boundaries. The model selects relevant context;
// the builder receives validated dates, including an identical start/end day.
export function activityDates(dates) {
  if(!dates||['unknown','ambiguous','alternatives'].includes(dates.status))return null;
  requireContract(dates.status==='resolved','invalid_activity_dates');
  daysBetween(dates.start,dates.end);
  return {arrival:dates.start,departure:dates.end};
}

export function bookingUrl(unit, dates, party, clock) {
  const query=actionDates(dates,clock), eligibility=eligibleUnit(party);
  requireContract(eligibility.ok,eligibility.reason);
  const p=eligibility.party,url=buildBookingLink(unit,query.arrival,query.departure,p.adults,p.children);
  requireContract(url,'invalid_booking_link');
  const u=new URL(url);
  requireContract(Number(u.searchParams.get('or_guests'))===p.total && Number(u.searchParams.get('or_children'))===p.children && Number(u.searchParams.get('or_adults'))===p.adults,'link_party_mismatch');
  return url;
}
export function ownerRezArguments(party) { const p=providerParty(party); return {adults:p.adults,children:p.children}; }
export function ownerRezQuoteArguments(unit, dates, party, clock) {
  const eligibility=eligibleUnit(party); requireContract(eligibility.ok,eligibility.reason);
  return {unit,...actionDates(dates,clock),...ownerRezArguments(party)};
}
const partialParty = p=>({status:'known',adults:p.adults,childrenIncludingInfants:p.children,total:p.total,infants:null,nonInfantChildren:null,infantsMentioned:false});
export class Actions {
  constructor({state,services,clock,outcomes}) {this.state=state;this.services=services;this.clock=clock;this.outcomes=outcomes;this.evidence=new Map();this.sequence=0;this.calls=[];}
  outcome(id, kinds) {const o=this.outcomes.find(o=>o.id===id);requireContract(o&&kinds.includes(o.kind),'outcome_tool_mismatch');return o;}
  add(kind,outcome,status,data={},extras={}) {
    const r={id:'e-'+(++this.sequence)+'-'+hash({kind,outcome,status,data,revision:this.state.revision}).slice(0,16),kind,outcomeId:outcome,status,revision:this.state.revision,checkedAt:this.clock.now,data,links:[],...extras};
    r.links=(r.links||[]).map(l=>{canonicalUrl(l.url);return {...l,revision:this.state.revision,type:'action',purpose:kind,source:'trusted_tool',outcomeId:outcome};});
    this.evidence.set(r.id,r);
    if(['availability','flight','activity'].includes(kind)||r.links.length||this.state.results.some(x=>x.kind===kind&&x.outcomeId===outcome)) {
      this.state={...this.state,results:[...this.state.results.filter(x=>kind==='availability'?x.kind!=='availability':x.outcomeId!==outcome),r]}; assertState(this.state);
    }
    return r;
  }
  async call(name,...args) {requireContract(typeof this.services[name]==='function','service_unavailable',{service:name});this.calls.push({name,args:structuredClone(args)});const result=await this.services[name](...args);assertPayloadSafe(result);return result;}
  invalidate() { for(const [id,r]of this.evidence) if(r.revision!==this.state.revision&&!['knowledge','calendar'].includes(r.kind))this.evidence.delete(id); }
  setStay(dates) {actionDates(dates,this.clock);this.state=transition(this.state,{stay:dates});this.invalidate();}
  async execute(name,args) {
    try {
      if(['check_availability','build_booking_links','find_open_windows'].includes(name)) return await this.availability(name,args);
      if(name==='get_destin_weather') return await this.weather(args);
      if(name==='build_flight_search') return await this.flight(args);
      if(name==='get_activity_options') return await this.activity(args);
      return await this.domain(name,args);
    } catch(error) {
      const status=error instanceof ContractError?error.code:'service_failed';
      const kind=['check_availability','build_booking_links','find_open_windows'].includes(name)?'availability':name==='get_destin_weather'?'weather':name==='build_flight_search'?'flight':'action';
      return this.add(kind,args.outcome_id,status,{reason:status,...(error.details||{})});
    }
  }
  async availability(name,args) { return executeBooking(this,name,args); }
  links(vacancy,dates,splits,requested=[]) {
    const units=['707','1006'];
    requireContract(!splits.length||!requested.length||units.every(u=>requested.includes(u)),'two_unit_scope_required');
    if(splits.length && !units.every(u=>vacancy?.[u]===true))return [];
    return units.filter(u=>vacancy?.[u]===true&&(!requested.length||requested.includes(u))).map(unit=>{
      const party=splits.length?partialParty(splits[0][units.indexOf(unit)]):this.state.party;
      return {unit,url:bookingUrl(unit,dates,party,this.clock),dates:{start:dates.start,end:dates.end},party:providerParty(party),revision:this.state.revision};
    });
  }
  async weather(args) {
    const o=this.outcome(args.outcome_id,['weather']);
    requireContract(o.dates?.status==='resolved','needs_weather_period');
    const requested=o.dates.dates||daysBetween(o.dates.start,o.dates.end);
    let raw;try{raw=await this.call('fetchDestinWeather');}catch{raw={status:'failed',forecast:[]};}
    const seen=new Set(),forecast=[];
    for(const day of Array.isArray(raw?.forecast)?raw.forecast:[]) {
      if(!['success','partial'].includes(raw.status)||!requested.includes(day.date)||seen.has(day.date))continue;
      if(typeof day.desc!=='string'||![day.hi,day.lo,day.rain].every(Number.isFinite)||day.rain<0||day.rain>100)continue;
      forecast.push({date:day.date,desc:day.desc,hi:day.hi,lo:day.lo,rain:day.rain});seen.add(day.date);
    }
    const missing=requested.filter(d=>!seen.has(d));
    return this.add('weather',o.id,missing.length?(forecast.length?'partial':'unavailable'):'success',{
      requestedDates:requested,forecast,unverifiedDates:missing,sourceStatus:raw?.status||'failed',sourceCheckedAt:raw?.checkedAt||null,
      dateProvenance:o.dates,conditionsEstablished:forecast.length>0,dangerEstablished:false
    });
  }
  async flight(args) {
    const o=this.outcome(args.outcome_id,['flight']),dates=actionDates(o.dates,this.clock),party=flightParty(this.state.party);
    requireContract(typeof o.origin_iata==='string'&&o.origin_iata.length===3&&[...o.origin_iata].every(c=>c>='A'&&c<='Z'),'needs_origin');
    const destination=o.destination_iata||'VPS';requireContract(['VPS','PNS','ECP'].includes(destination),'invalid_destination');
    this.state=transition(this.state,{flight:{...o.dates,origin:o.origin_iata,destination}});this.invalidate();
    const url=buildFlightLink(o.origin_iata,dates.arrival,dates.departure,party.adults,party.children,party.infants,destination);requireContract(url,'invalid_flight_link');
    return this.add('flight',o.id,'success',{party,origin:o.origin_iata,destination,liveInventoryChecked:false},{query:{...dates,...party},links:[{url,revision:this.state.revision}]});
  }
  async activity(args) {
    const o=this.outcome(args.outcome_id,['activity']);requireContract(Object.hasOwn(TRIPSHOCK_CATEGORIES,args.category),'invalid_activity_category');
    const dates=activityDates(o.dates);
    const url=buildTripShockLink(args.category,dates);
    return this.add('activity',o.id,'success',{category:args.category,liveInventoryChecked:false},{query:dates,links:[{url,revision:this.state.revision}]});
  }
  async domain(name,args) {
    const kinds={get_beach_conditions:['beach'],get_beach_deals:['deals'],get_guide_link:['guide'],search_current_events:['events'],request_owner_chat:['owner_chat'],relay_owner_message:['relay'],create_maintenance_alert:['maintenance'],capture_lead:['lead'],get_existing_booking:['existing_booking']};
    const o=this.outcome(args.outcome_id,kinds[name]||[]);
    // Adapters receive only the interpreted scope, never raw guest language for reclassification.
    const adapter=this.services.domainAdapters?.[name];requireContract(typeof adapter==='function','service_unavailable');
    const input={outcome:structuredClone(o),party:structuredClone(this.state.party),revision:this.state.revision,turn:this.state.concierge.turn,clock:structuredClone(this.clock),arguments:structuredClone(args)};
    const raw=await adapter(input);
    requireContract(raw&&['success','partial','unavailable','denied'].includes(raw.status),'invalid_service_result');
    assertPayloadSafe(raw);
    const authoritative=['success','partial'].includes(raw.status);
    const links=(authoritative?raw.links||[]:[]).map(link=>{const u=new URL(link.url);requireContract(u.protocol==='https:'&&!u.username&&!u.password,'invalid_service_link');return {...link,revision:this.state.revision};});
    const data=authoritative?raw.data||{}:{reason:raw.status};
    if(['owner_chat','relay','maintenance','lead'].includes(o.kind)&&raw.status==='success') requireContract(typeof raw.receiptId==='string'&&raw.receiptId.length>0,'action_receipt_required');
    return this.add(o.kind,o.id,raw.status,{...data,receiptId:raw.status==='success'?raw.receiptId||null:null},{links});
  }
}
