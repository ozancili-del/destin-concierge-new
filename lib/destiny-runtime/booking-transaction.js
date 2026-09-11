import {normalizeState,validateDateRange,validateParty,buildBookingLink,findValidTwoUnitSplits,resolveHolidayStay} from '../destiny-agent/business.js';
import {fieldEvidence} from './guest-evidence.js';

const integer=v=>typeof v==='number'&&Number.isInteger(v)&&v>=0&&v<=12?v:null;
export const guestDate=iso=>/^\d{4}-\d{2}-\d{2}$/.test(iso||'')?new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(iso+'T12:00:00Z')):String(iso||'');
export const guestParty=(adults,children)=>`${adults} ${adults===1?'adult':'adults'} and ${children===0?'no children':`${children} ${children===1?'child':'children'}`}`;
export async function bookingTransaction(state,delta={}, {services,now=new Date(),signal}={}){
 const next=normalizeState(structuredClone(state)),old=next.booking,b={...old},repairs=[];
 // The model provides a semantic delta only. All arithmetic, state inheritance,
 // freshness and URL construction live inside this locked server transaction.
 if(delta.dateMode==='ambiguous')return {state:next,status:'clarification',completed:false,evidence:[fieldEvidence('booking.clarification','dates','unknown',null,`Do you want to change ${old.arrival&&old.departure?`arrival on ${guestDate(old.arrival)}, departure on ${guestDate(old.departure)}, or both`:'the arrival date, departure date, or both'}?`,{kind:'clarification'})],links:[],repairs};
 if(delta.dateMode==='holiday'&&delta.holiday){const stay=resolveHolidayStay(delta.holiday,now);if(stay){b.arrival=stay.arrival;b.departure=stay.departure;repairs.push('holiday_dates_calculated');}}
 for(const k of ['arrival','departure'])if(delta[k]!=null)b[k]=delta[k];
 if(['current_trip','unchanged'].includes(delta.partyScope||'current_trip')){
  for(const k of ['adults','children'])if(delta[k]!=null){const n=integer(delta[k]);if(n!==null)b[k]=n;else return {state:next,status:'clarification',completed:false,evidence:[fieldEvidence('booking.clarification','party','unknown',null,'How many adults and children are travelling?',{kind:'clarification'})],links:[],repairs};}
  if(delta.totalGuests!=null&&integer(delta.totalGuests)!==null){
   const total=integer(delta.totalGuests);
   if(delta.adults!=null&&delta.children==null&&total>=b.adults){b.children=total-b.adults;repairs.push('children_derived_from_explicit_total');}
   else if(delta.children!=null&&delta.adults==null&&total>=b.children){b.adults=total-b.children;repairs.push('adults_derived_from_explicit_total');}
   else if(b.adults==null||b.children==null)b.totalGuests=total;
  }
 }
 if(delta.partyScope==='ambiguous')return {state:next,status:'clarification',completed:false,evidence:[fieldEvidence('booking.clarification','party','unknown',null,'How many adults and children are travelling on this stay?',{kind:'clarification'})],links:[],repairs};
 if(delta.unit!=null&&['707','1006','both'].includes(delta.unit))b.preferredUnit=delta.unit==='both'?null:delta.unit;
 if(b.adults!=null&&b.children!=null){if(b.totalGuests!==b.adults+b.children)repairs.push('total_recalculated');b.totalGuests=b.adults+b.children;}
 const changed=['arrival','departure','adults','children','preferredUnit'].some(k=>b[k]!==old[k]);
 if(changed){next.verified.bookingUrls=[];next.verified.availabilityQuery=null;next.verified.availabilityCheckedAt=null;next.verified.availabilityUnits={'707':null,'1006':null};next.verified.flightUrls=[];next.verified.activityUrls=[];}
 next.booking=b;next.mode='booking';
 const dates=validateDateRange(b,now),party=validateParty(b.adults,b.children);
 if(!dates.ok||!party.ok){
  const question=!dates.ok?(dates.code==='past_dates'?'Those dates are in the past. What future check-in and check-out dates would you like?':dates.code==='reversed_dates'?'Check-out must be after check-in. Which dates would you like?':'What check-in and check-out dates would you like?'):party.code==='hoa_violation'?'The adult-to-child ratio does not meet the resort requirements. Can you confirm the travelling party?':party.code==='occupancy_exceeded'?'The travelling party exceeds the combined occupancy limit. Can you confirm the guest count?':'How many adults and children are travelling?';
  return {state:next,status:'clarification',completed:false,evidence:[fieldEvidence('booking.clarification',!dates.ok?'dates':'party','unknown',null,question,{kind:'clarification'})],links:[],repairs};
 }
 if(signal?.aborted)throw new Error('turn_cancelled');
 const checkedAt=new Date(now).toISOString();
 const [availability,drops]=await Promise.all([
  Promise.resolve().then(()=>services.checkBothUnits(b.arrival,b.departure)).catch(()=>({'707':null,'1006':null})),
  Promise.resolve().then(()=>services.fetchPriceDrops?.(b.arrival,b.departure)).catch(()=>null)
 ]);
 if(signal?.aborted)throw new Error('turn_cancelled');
 const fields=Object.fromEntries(['707','1006'].map(id=>[id,typeof availability?.[id]==='boolean'?{status:'verified',value:availability[id]}:{status:'unavailable',value:null}]));
 const links=[],allocations=party.needsTwoUnits?findValidTwoUnitSplits(b.adults,b.children)[0]:null;
 if(!party.needsTwoUnits||['707','1006'].every(id=>fields[id].value===true))for(const id of ['707','1006']){
  if(fields[id].value!==true)continue;
  const a=party.needsTwoUnits?(id==='707'?allocations?.a1:allocations?.a2):b.adults,c=party.needsTwoUnits?(id==='707'?allocations?.c1:allocations?.c2):b.children;
  const url=buildBookingLink(id,b.arrival,b.departure,a,c);if(url)links.push({id:`booking.link.${id}`,url,label:`Book unit ${id}`,unit:id,adults:a,children:c,required:party.needsTwoUnits||!b.preferredUnit||b.preferredUnit===id});
 }
 next.verified.bookingUrls=links.map(l=>l.url);next.verified.availabilityQuery={arrival:b.arrival,departure:b.departure,adults:b.adults,children:b.children};next.verified.availabilityCheckedAt=checkedAt;next.verified.availabilityUnits=Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v.value]));
 const evidence=[fieldEvidence('booking.trip','trip','verified',{arrival:b.arrival,departure:b.departure,adults:b.adults,children:b.children,totalGuests:b.totalGuests},`I checked ${guestDate(b.arrival)} to ${guestDate(b.departure)} for ${guestParty(b.adults,b.children)}.`,{kind:'booking',checkedAt}),...Object.entries(fields).map(([id,f])=>fieldEvidence(`booking.unit.${id}`,`unit.${id}.availability`,f.status,f.value,f.status!=='verified'?`Availability for unit ${id} could not be verified.`:`Unit ${id} ${f.value?'is available':'is unavailable'} for your stay.`,{kind:'booking',checkedAt})),fieldEvidence('booking.review','booking_process','verified',true,'You can review the guest counts and complete the reservation on the secure booking page.',{kind:'booking'})];
 for(const d of drops?.status==='success'?drops.drops||[]:[]){
  if(fields[d.unit]?.value!==true||!Number.isFinite(d.dropPct)||d.dropPct<5||d.dropPct>60||!Number.isFinite(d.fromPrice)||!Number.isFinite(d.toPrice)||d.fromPrice<=d.toPrice||d.toPrice<=0)continue;
  evidence.push(fieldEvidence(`booking.price.${d.unit}`,'price_drop','verified',d,`The published rate for available unit ${d.unit} is ${d.dropPct}% lower than its recorded earlier rate.`,{kind:'price',checkedAt:drops.checkedAt||checkedAt}));
 }
 const requiredEvidenceIds=evidence.filter(e=>!e.id.startsWith('booking.unit.')||party.needsTwoUnits||!b.preferredUnit||e.id===`booking.unit.${b.preferredUnit}`).map(e=>e.id);
 return {state:next,status:Object.values(fields).every(f=>f.status==='verified')?'complete':'partial',completed:Object.values(fields).every(f=>f.status==='verified'),query:next.verified.availabilityQuery,fields,evidence,links,repairs,requiredEvidenceIds,priceDropReceipt:drops||null};
}
