import {createHash} from 'node:crypto';
import {hasCurrentInputSpan} from './input-provenance.mjs';
import {isIsoDate, addIsoDays, diffNights, createDefaultState, buildBookingLink} from './vendor/business.mjs';

export function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
export const hash = value => createHash('sha256').update(stable(value)).digest('hex');
export class ContractError extends Error { constructor(code, details = {}) { super(code); this.code = code; this.details = details; } }
export function requireContract(condition, code, details) { if (!condition) throw new ContractError(code, details); }
const integer = (v, min = 0, max = 100) => Number.isInteger(v) && v >= min && v <= max;
export function unknownParty(status = 'unknown') {
  return {status, adults: null, childrenIncludingInfants: null, nonInfantChildren: null, infants: null, infantsMentioned: false, total: null};
}
export function resolveParty(update, previous = unknownParty(), guest = '') {
  if (update.operation === 'retain') return structuredClone(previous);
  requireContract(['replace', 'ambiguous'].includes(update.operation), 'invalid_party_operation');
  requireContract(hasCurrentInputSpan(guest,update.evidence), 'party_evidence_required');
  if (update.operation === 'ambiguous') return {...unknownParty('ambiguous'), infantsMentioned: previous.infantsMentioned || update.infants_mentioned === true};
  for (const key of ['adults', 'children_including_infants', 'non_infant_children', 'infants', 'total_guests']) {
    requireContract(update[key] == null || integer(update[key]), 'invalid_party_count', {field: key});
  }
  const adults = update.adults ?? null, infants = update.infants ?? null, nonInfant = update.non_infant_children ?? null;
  const mentioned = update.infants_mentioned === true || (infants !== null && infants > 0);
  let combined = update.children_including_infants ?? null;
  if (infants !== null && nonInfant !== null) {
    requireContract(combined === null || combined === infants + nonInfant, 'inconsistent_child_composition');
    combined = infants + nonInfant;
  }
  let resolvedInfants = infants, resolvedNonInfant = nonInfant;
  if (combined !== null && infants !== null) {
    requireContract(infants <= combined, 'inconsistent_child_composition');
    resolvedNonInfant ??= combined - infants;
  }
  if (combined !== null && nonInfant !== null) {
    requireContract(nonInfant <= combined, 'inconsistent_child_composition');
    resolvedInfants ??= combined - nonInfant;
  }
  const total = adults !== null && combined !== null ? adults + combined : null;
  requireContract(update.total_guests == null || total === null || update.total_guests === total, 'inconsistent_party_total');
  return {status: total === null ? 'unknown' : 'known', adults, childrenIncludingInfants: combined,
    infants: resolvedInfants, nonInfantChildren: resolvedNonInfant, infantsMentioned: mentioned,
    total: total ?? update.total_guests ?? null};
}
export function providerParty(party) {
  requireContract(party.status === 'known' && integer(party.adults, 1) && integer(party.childrenIncludingInfants), 'needs_party_clarification', {missingFields:['adults','children_including_infants']});
  requireContract(party.total === party.adults + party.childrenIncludingInfants, 'inconsistent_party_total');
  if (party.infants !== null && party.nonInfantChildren !== null) requireContract(party.infants + party.nonInfantChildren === party.childrenIncludingInfants, 'inconsistent_child_composition');
  return {adults: party.adults, children: party.childrenIncludingInfants, total: party.total};
}
export function flightParty(party) {
  const provider = providerParty(party);
  if (party.infantsMentioned && (party.infants === null || party.nonInfantChildren === null)) throw new ContractError('needs_flight_breakdown', {missingFields:['non_infant_children','infants']});
  const infants = party.infantsMentioned ? party.infants : 0;
  const children = party.infantsMentioned ? party.nonInfantChildren : provider.children;
  requireContract(provider.adults + children + infants === provider.total, 'inconsistent_flight_party');
  return {adults: provider.adults, children, infants, total: provider.total, infantBaseline: !party.infantsMentioned};
}
export function eligibleUnit(party) {
  const p = providerParty(party);
  if (p.total > 6) return {ok: false, reason: 'occupancy_exceeded', party: p};
  if (p.adults < Math.ceil(p.children / 3)) return {ok: false, reason: 'hoa_violation', party: p};
  return {ok: true, party: p};
}
export function validSplits(party) {
  const p = providerParty(party), splits = [];
  if (p.total > 12) return splits;
  for (let a = 1; a < p.adults; a++) for (let c = 0; c <= p.children; c++) {
    const parts = [{adults:a,children:c,total:a+c},{adults:p.adults-a,children:p.children-c,total:p.total-a-c}];
    if (parts.every(x=>x.total<=6 && x.adults>=Math.ceil(x.children/3))) splits.push(parts);
  }
  return splits.sort((a,b)=>Math.abs(a[0].total-a[1].total)-Math.abs(b[0].total-b[1].total));
}
export function localDay(clock) {
  requireContract(clock && typeof clock.timeZone === 'string' && typeof clock.locale === 'string', 'clock_required');
  const date = new Date(clock.now); requireContract(Number.isFinite(date.getTime()), 'invalid_clock');
  const parts = new Intl.DateTimeFormat('en-US', {timeZone:clock.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  return ['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('-');
}
export function daysBetween(start, end) {
  requireContract(isIsoDate(start) && isIsoDate(end) && end >= start, 'invalid_calendar_range');
  const length = diffNights(start,end); requireContract(length <= 366, 'calendar_range_too_large');
  return Array.from({length:length+1},(_,i)=>addIsoDays(start,i));
}
export function calendar(operation, clock, stay = null, flight = null) {
  const today = localDay(clock), type = operation.kind;
  const exact = (start,end,precision,source) => {
    daysBetween(start,end); return {status:'resolved',start,end,precision,source,clock:{...clock,today}};
  };
  if (type === 'retain_stay' || type === 'retain_flight') return structuredClone((type==='retain_stay'?stay:flight) || {status:'unknown'});
  if (type === 'unknown' || type === 'ambiguous') return {status:type};
  if (type === 'exact_day') return exact(operation.start,operation.start,'day','guest_exact');
  if (type === 'exact_range') return exact(operation.start,operation.end,'exact','guest_exact');
  if (type === 'relative_day') {
    requireContract(integer(operation.offset_days,-366,366),'invalid_day_offset');
    const day = addIsoDays(today,operation.offset_days); return exact(day,day,'day','calendar_calculation');
  }
  if (type === 'calendar_week' || type === 'week_part') {
    requireContract(integer(operation.week_offset,-52,52),'invalid_week_offset');
    const locale = new Intl.Locale(clock.locale), info = locale.getWeekInfo?.() || locale.weekInfo;
    requireContract(info && integer(info.firstDay,1,7),'unsupported_locale_week');
    const dow = new Date(today+'T12:00:00Z').getUTCDay();
    const first = info.firstDay % 7;
    const weekStart = addIsoDays(today,-((dow-first+7)%7)+operation.week_offset*7);
    const week = daysBetween(weekStart,addIsoDays(weekStart,6));
    const selected = type==='calendar_week'?week:week.filter(d=>operation.weekdays?.includes(new Date(d+'T12:00:00Z').getUTCDay()));
    requireContract(selected.length>0 && (type!=='week_part'||operation.weekdays.every(x=>integer(x,0,6))),'invalid_week_part');
    return {...exact(selected[0],selected.at(-1),type==='calendar_week'?'period':'approximate','calendar_calculation'),dates:selected};
  }
  if (type === 'shift_stay' || type === 'clarify_shift') {
    requireContract(stay?.precision==='exact','needs_exact_dates');
    requireContract(integer(operation.offset_days,-366,366) && operation.offset_days!==0,'invalid_day_offset');
    const shifted = boundary=>({start:boundary==='checkout'?stay.start:addIsoDays(stay.start,operation.offset_days),end:boundary==='checkin'?stay.end:addIsoDays(stay.end,operation.offset_days)});
    if(type==='clarify_shift') return {status:'alternatives',precision:'proposed',choices:['checkin','checkout','whole_stay'].map(boundary=>({boundary,...shifted(boundary)})).filter(x=>x.end>x.start&&x.start>=today),clock:{...clock,today}};
    requireContract(['checkin','checkout','whole_stay'].includes(operation.boundary),'invalid_date_boundary');
    const d=shifted(operation.boundary); requireContract(d.end>d.start,'invalid_calendar_range');
    return exact(d.start,d.end,'exact','calendar_calculation');
  }
  throw new ContractError('unknown_calendar_operation');
}
export function actionDates(dates, clock) {
  requireContract(dates?.status==='resolved' && dates.precision==='exact','needs_exact_dates', {missingFields:['exact_arrival','exact_departure']});
  requireContract(isIsoDate(dates.start)&&isIsoDate(dates.end)&&dates.end>dates.start,'invalid_action_dates');
  requireContract(dates.start>=localDay(clock),'past_dates');
  return {arrival:dates.start,departure:dates.end};
}
export function hydrate(input = {}) {
  const source = structuredClone(input), old = source.contract;
  if ([1,2].includes(old?.version)) { assertState(old);return old.version===2?old:{...old,version:2,results:[],lodging:{activeKey:null,resources:{}}}; }
  let party=unknownParty(); const b=source.booking||{};
  if (integer(b.adults,1) && integer(b.children)) {
    party={...party,status:'known',adults:b.adults,childrenIncludingInfants:b.children,total:b.adults+b.children};
    if(b.totalGuests!=null&&b.totalGuests!==party.total) party={...unknownParty('ambiguous'),migrationReason:'inconsistent_legacy_total'};
  }
  const stay=isIsoDate(b.arrival)&&isIsoDate(b.departure)&&b.departure>b.arrival?{status:'resolved',precision:'exact',start:b.arrival,end:b.departure,source:'legacy_state'}:null;
  return revise({version:2,party,stay,flight:null,results:[],lodging:{activeKey:null,resources:{}},knowledge:{revision:null,entityIds:[]},concierge:{turn:0,pendingSearch:null},revision:null});
}
export function revisionOf(s) { return hash({party:s.party,stay:s.stay,flight:s.flight}); }
export function revise(s) { const next=structuredClone(s); next.revision=revisionOf(next); return next; }
export function transition(state, patch) {
  const next=revise({...state,...structuredClone(patch)});
  if(next.revision!==state.revision) next.results=[];
  if(next.lodging){
    for(const r of Object.values(next.lodging.resources))if(r.linkBundle?.partyRevision!==hash(next.party))r.linkBundle=null;
    const active=next.lodging.resources[next.lodging.activeKey];
    if(active&&(active.query.arrival!==next.stay?.start||active.query.departure!==next.stay?.end))next.lodging.activeKey=null;
  }
  assertState(next); return next;
}
export function assertState(s) {
  requireContract([1,2].includes(s.version) && Array.isArray(s.results),'invalid_contract_state');
  if(s.party.status==='known') providerParty(s.party);
  requireContract(s.revision===revisionOf(s),'invalid_state_revision');
  if(s.version===2){
    requireContract(s.lodging&&typeof s.lodging.resources==='object','invalid_lodging_state');
    for(const [key,r]of Object.entries(s.lodging.resources)){
      requireContract(key===hash(r.query)&&r.key===key,'invalid_resource_key');
      if(r.latestAttempt)requireContract(['success','failed'].includes(r.latestAttempt.status),'invalid_attempt_status');
      if(r.lastSuccessfulObservation)requireContract(stable(r.lastSuccessfulObservation.query)===stable(r.query),'observation_query_mismatch');
      if(r.linkBundle){
        requireContract(r.linkBundle.partyRevision===hash(s.party),'link_bundle_party_mismatch');
        const p=providerParty(s.party),b=r.linkBundle;
        requireContract(b.query.adults===p.adults&&b.query.children===p.children&&b.query.total===p.total,'link_bundle_party_mismatch');
        if(b.links.length){if(b.requiresTwoUnits)requireContract(b.links.length===2&&b.links.reduce((n,l)=>n+l.party.adults,0)===p.adults&&b.links.reduce((n,l)=>n+l.party.children,0)===p.children,'split_party_mismatch');else requireContract(b.links.every(l=>stable(l.party)===stable(p)),'link_bundle_party_mismatch');}
        for(const l of b.links)requireContract(l.url===buildBookingLink(l.unit,l.dates.start,l.dates.end,l.party.adults,l.party.children),'link_bundle_url_mismatch');
        for(const l of r.linkBundle.links){const u=new URL(l.url);requireContract(r.query.units.includes(l.unit)&&l.dates.start===r.query.arrival&&l.dates.end===r.query.departure,'link_bundle_query_mismatch');requireContract(l.party.adults+l.party.children===l.party.total&&l.party.total<=6&&l.party.adults>=Math.ceil(l.party.children/3),'invalid_link_party');requireContract(Number(u.searchParams.get('or_guests'))===l.party.total&&Number(u.searchParams.get('or_adults'))===l.party.adults&&Number(u.searchParams.get('or_children'))===l.party.children&&u.searchParams.get('or_arrival')===l.dates.start&&u.searchParams.get('or_departure')===l.dates.end,'link_bundle_url_mismatch');}
      }
    }
  }
  for(const r of s.results) {
    requireContract(r.revision===s.revision,'stale_persisted_result');
    if(r.status!=='success'&&r.status!=='refresh_failed')continue;
    for(const link of r.links||[])requireContract(link.revision===s.revision,'stale_persisted_link');
    if(r.kind==='availability') {
      const party=providerParty(s.party);
      requireContract(r.query?.adults===party.adults&&r.query.children===party.children&&r.query.total===party.total&&r.query.partyRevision===hash(s.party),'result_party_mismatch');
      requireContract(r.query.arrival===s.stay?.start&&r.query.departure===s.stay?.end,'result_date_mismatch');
      const groups=r.data.options||[{dates:s.stay,links:r.links}];
      for(const option of groups) {
        for(const link of option.links) {
          const u=new URL(link.url),p=link.party;
          requireContract(p.adults+p.children===p.total&&p.total<=6&&p.adults>=Math.ceil(p.children/3),'invalid_link_party');
          requireContract(Number(u.searchParams.get('or_guests'))===p.total&&Number(u.searchParams.get('or_adults'))===p.adults&&Number(u.searchParams.get('or_children'))===p.children,'link_party_mismatch');
          requireContract(link.dates.start===option.dates.start&&link.dates.end===option.dates.end&&u.searchParams.get('or_arrival')===link.dates.start&&u.searchParams.get('or_departure')===link.dates.end,'link_date_mismatch');
        }
        if(r.data.requiresTwoUnits)requireContract(option.links.length===2&&option.links.reduce((n,l)=>n+l.party.adults,0)===party.adults&&option.links.reduce((n,l)=>n+l.party.children,0)===party.children,'split_party_mismatch');
        else requireContract(option.links.every(l=>stable(l.party)===stable(party)),'link_party_mismatch');
      }
    }
    if(r.kind==='flight') {
      const p=flightParty(s.party);
      requireContract(stable(r.data.party)===stable(p)&&r.query.adults===p.adults&&r.query.children===p.children&&r.query.infants===p.infants&&r.query.total===p.total,'result_party_mismatch');
      requireContract(r.query.arrival===s.flight?.start&&r.query.departure===s.flight?.end&&r.data.origin===s.flight?.origin&&r.data.destination===s.flight?.destination,'result_date_mismatch');
    }
  }
}
export function projectState(s, previous = {}) {
  assertState(s); const out=createDefaultState();
  // Compatibility aliases are generated views, never independent input authorities.
  out.contract=structuredClone(s);
  out.booking={...out.booking,arrival:s.stay?.start||null,departure:s.stay?.end||null,adults:s.party.adults,children:s.party.childrenIncludingInfants,totalGuests:s.party.total,dateSource:s.stay?.source||null};
  const availability=s.results.findLast(r=>r.kind==='availability');
  const resource=s.lodging?.resources[s.lodging.activeKey];
  out.booking.linkUrls=(resource?.linkBundle?.links||[]).map(l=>l.url);
  out.booking.lastObservedAvailability=structuredClone(resource?.lastSuccessfulObservation||null);
  out.booking.latestAvailabilityAttempt=structuredClone(resource?.latestAttempt||null);
  if(availability?.status==='success'&&availability.data.availabilityConfirmedThisTurn){out.verified.bookingUrls=availability.links.map(x=>x.url);out.verified.availabilityQuery={...availability.query,revision:s.revision};out.verified.availabilityCheckedAt=availability.checkedAt;out.verified.availabilityUnits=availability.data.vacancy||null;out.verified.availabilityOptions=structuredClone(availability.data.options||[]);}
  if(s.flight) {
    let party=null;try{party=flightParty(s.party);}catch(error){if(!(error instanceof ContractError))throw error;}
    out.flight={...out.flight,originIata:s.flight.origin,destinationIata:s.flight.destination,departureDate:s.flight.precision==='exact'?s.flight.start:null,returnDate:s.flight.precision==='exact'?s.flight.end:null,dateSource:s.flight.source,adults:party?.adults??null,children:party?.children??null,infants:party?.infants??null,total:party?.total??null};
  }
  out.verified.activityUrls=s.results.filter(r=>r.kind==='activity'&&r.status==='success').flatMap(r=>r.links.map(l=>l.url));
  out.verified.flightUrls=s.results.filter(r=>r.kind==='flight'&&r.status==='success').flatMap(r=>r.links.map(l=>l.url));
  out.verified.flightQuery=structuredClone(s.results.findLast(r=>r.kind==='flight'&&r.status==='success')?.query||null);
  out.verified.activityQuery=structuredClone(s.results.findLast(r=>r.kind==='activity'&&r.status==='success')?.query||null);
  out.meta={...out.meta,language:previous.meta?.language||'en'};
  return out;
}
