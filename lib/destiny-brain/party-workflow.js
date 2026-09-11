import {ContractRuntime} from './accepted/runtime.mjs';
import {TOOLS,validate} from './accepted/schema.mjs';
import {ContractError,requireContract,resolveParty,hash,stable} from './accepted/kernel.mjs';
import {assertPayloadSafe} from './accepted/vendor/privacy.mjs';

export const WORKFLOW_VERSION='party-context-patch-v1';
export const WORKFLOW_TOOLS=structuredClone(TOOLS);
const interpretation=WORKFLOW_TOOLS.find(t=>t.name==='interpret_request');
interpretation.parameters.properties.party.properties.operation.enum.push('add','remove','patch');
interpretation.description+=' For party additions/removals use add/remove with only changed counts; patch replaces only specified counts. Null fields preserve prior counts. replace is reserved for a complete new party. ambiguous preserves confirmed counts while clarification is pending.';

const GUIDANCE=`ACTIVE BOOKING WORKFLOW
Interpret a guest's party addition or correction as a context patch, even when the guest does not repeat a booking request. Use add/remove for deltas, patch for corrected component totals, replace only for a complete new party. Null means unchanged for patches. For add/remove total_guests is the delta checksum, not the resulting party total; omit it when unnecessary. Preserve dates, unit and unaffected adults/children. Interpret ordinary language and clarification replies using the full conversation; never treat a newly mentioned count as the entire party. An ambiguous addition retains confirmed counts; ask only what is missing, then apply the clarified delta once.
With an active generated booking link, party-only updates automatically complete a link-only booking action during interpretation. Its completedBooking result is authoritative; do not repeat it or call availability. Preserve the active unit when no unit change was requested. Declare a booking/availability outcome with refresh for explicit rechecks or changed dates/unit. Unknown dates are not permission to reuse a previous stay for a requested change; ask for clarification.
The workflow retrieves applicable HQ booking terms and computes the extra-guest nightly charge. Naturally mention a changed material surcharge and that it is included in displayed rent, along with the updated party and booking link. A link-only result never establishes fresh availability. Complete this booking update before optional layout advice. If occupancy or party details block completion, explain that specific issue; never present an old link as updated. Compose one natural answer using these facts and the shared decision; no channel-specific actions.`;

const fields={adults:'adults',children_including_infants:'childrenIncludingInfants',non_infant_children:'nonInfantChildren',infants:'infants'};
export function normalizePartyPatch(update,previous,guest){
  if(update.operation==='ambiguous'){
    // Validate current-turn provenance without erasing confirmed components.
    resolveParty(update,previous,guest);
    return {...update,operation:'retain'};
  }
  if(!['add','remove','patch'].includes(update.operation))return update;
  const changed=Object.keys(fields).filter(k=>update[k]!==null);
  requireContract(changed.length,'needs_party_clarification');
  const next={...update,operation:'replace',total_guests:null,infants_mentioned:previous.infantsMentioned||update.infants_mentioned};
  for(const [input,key]of Object.entries(fields)){
    if(update[input]===null)next[input]=previous[key];
    else if(update.operation==='patch')next[input]=update[input];
    else{
      // A missing previous component is not zero. A known zero combined child
      // count does, however, establish that both child subcomponents are zero.
      const before=previous[key]??(['infants','nonInfantChildren'].includes(key)&&previous.childrenIncludingInfants===0?0:null);
      requireContract(before!==null,'needs_party_clarification',{missingFields:[input]});
      next[input]=before+(update.operation==='remove'?-1:1)*update[input];
    }
  }
  const combinedChanged=update.children_including_infants!==null;
  const splitChanged=update.non_infant_children!==null||update.infants!==null;
  if(combinedChanged&&!splitChanged){next.non_infant_children=null;next.infants=null;}
  if(!combinedChanged&&splitChanged){
    if(next.non_infant_children!==null&&next.infants!==null)next.children_including_infants=next.non_infant_children+next.infants;
    else if(update.operation!=='patch'&&previous.childrenIncludingInfants!==null){
      next.children_including_infants=previous.childrenIncludingInfants+(update.operation==='remove'?-1:1)*((update.non_infant_children??0)+(update.infants??0));
    }else throw new ContractError('needs_party_clarification');
  }
  if(update.total_guests!==null){
    const expected=update.operation==='patch'?next.adults+next.children_including_infants:(update.adults??0)+(update.children_including_infants??((update.non_infant_children??0)+(update.infants??0)));
    requireContract(update.total_guests===expected,'inconsistent_party_total');
  }
  resolveParty(next,previous,guest);return next;
}

// Compile the existing approved guest-facing rule into arithmetic. This reads
// only the booking projection; no separate fee table or guest phrase matching.
export function extraGuestTerms(packages,total){
  const p=packages.find(p=>p.id==='booking_payment_terms');
  const fact=p?.facts.find(f=>f.id==='booking_additional_guest_pricing_owner');
  requireContract(fact,'booking_fee_authority_missing');
  const match=/^A \$(\d+(?:\.\d{1,2})?)-per-night charge applies for each guest above (\w+), within the (\w+)-person maximum, and is consolidated into the displayed rent\.$/.exec(fact.text);
  requireContract(match,'booking_fee_authority_unrecognized');
  const words=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve'];
  const number=s=>/^\d+$/.test(s)?Number(s):words.indexOf(s);
  const includedGuests=number(match[2]),maximumGuests=number(match[3]),perGuestPerNightUsd=Number(match[1]);
  requireContract(includedGuests>=0&&maximumGuests>includedGuests&&perGuestPerNightUsd>0,'booking_fee_authority_unrecognized');
  const extraGuests=Number.isInteger(total)?Math.max(0,total-includedGuests):null;
  return {packageId:p.id,factId:fact.id,factHash:hash(fact),hqRevision:p.hqRevision,includedGuests,maximumGuests,perGuestPerNightUsd,extraGuests,nightlySurchargeUsd:extraGuests===null?null:extraGuests*perGuestPerNightUsd,includedInDisplayedRent:true,scope:'direct_booking',fact:fact.text};
}

export class PartyWorkflowRuntime extends ContractRuntime{
  input(){
    const input=super.input();
    // Owner authority remains the final developer block, as required by the
    // accepted runtime. This narrows action completion, not HQ authority.
    input.splice(input.findLastIndex(m=>m.role==='developer'),0,{role:'developer',content:GUIDANCE});return input;
  }
  async tool(name,rawArgs){
    if(name!=='interpret_request'){
      // Repeated model requests for the completed automatic action replay it.
      if(['build_booking_links','check_availability'].includes(name)&&this.completedBooking?.outcomeId===rawArgs?.outcome_id){
        try{validate(WORKFLOW_TOOLS.find(t=>t.name===name).parameters,rawArgs);return this.completedBooking;}
        catch(e){return {ok:false,status:e.code||'tool_boundary_failed'};}
      }
      return super.tool(name,rawArgs);
    }
    try{
      assertPayloadSafe(rawArgs);
      const args=validate(interpretation.parameters,rawArgs),before=structuredClone(this.state);
      args.party=normalizePartyPatch(args.party,before.party,this.guest);
      const active=before.lodging.resources[before.lodging.activeKey];
      // Validate the applicable HQ authority before committing the party patch.
      // Split bookings require per-unit fee allocation and retain their existing
      // explicit workflow; never apply a single-unit fee to a combined party.
      let terms,fee,priorFee;
      if(active?.linkBundle?.links.length&&!active.linkBundle.requiresTwoUnits&&args.party.operation!=='retain'){
        terms=this.packages(['booking_payment_terms'],'booking');
        requireContract(terms.knowledgeState==='data','booking_fee_authority_missing');
        fee=extraGuestTerms(terms.packages,resolveParty(args.party,before.party,this.guest).total);
        priorFee=extraGuestTerms(terms.packages,before.party.total);
      }
      const result=super.interpret(args);
      this.workflowFailure=null;
      const partyChanged=stable(before.party)!==stable(this.state.party);
      const lodging=this.outcomes.filter(o=>['booking','availability'].includes(o.kind));
      const sameStay=before.stay?.start===this.state.stay?.start&&before.stay?.end===this.state.stay?.end;
      const sameResource=lodging.every(o=>o.booking_operation==='link_only'&&o.dates.start===active?.query.arrival&&o.dates.end===active?.query.departure&&(!o.unit_ids.length||stable([...o.unit_ids].sort())===stable(active?.query.units)));
      if(!partyChanged||!active?.linkBundle?.links.length||active.linkBundle.requiresTwoUnits||!sameStay||!sameResource)return result;
      let outcome=lodging[0];
      if(!outcome){
        let id='active-party-update';while(this.outcomes.some(o=>o.id===id))id+='-next';
        outcome={id,kind:'booking',description:'Update the active booking link for the changed party',dates:structuredClone(before.stay),unit_ids:[...active.query.units],unit_scope:active.linkBundle.requiresTwoUnits?'two':'one',booking_operation:'link_only'};
        this.outcomes.push(outcome);
      }else{outcome.unit_ids=[...active.query.units];outcome.unit_scope=active.linkBundle.requiresTwoUnits?'two':'one';}
      this.engine.outcomes=this.outcomes;this.actionsStarted=true;
      let booking;
      if(outcome.unit_scope==='one'&&this.state.party.total>fee.maximumGuests){
        booking=this.engine.add('availability',outcome.id,'occupancy_exceeded',{maximumGuests:fee.maximumGuests,availabilityConfirmedThisTurn:false});
      }else booking=await this.engine.execute('build_booking_links',{outcome_id:outcome.id});
      this.state=this.engine.state;this.completedBooking=booking;
      return {...result,revision:this.state.revision,outcomes:this.outcomes,workflow:WORKFLOW_VERSION,completedBooking:booking,bookingTerms:{...fee,previousNightlySurchargeUsd:priorFee.nightlySurchargeUsd,surchargeChanged:priorFee.nightlySurchargeUsd!==fee.nightlySurchargeUsd},workflowActions:[{name:'get_hq_booking_terms',packageIds:['booking_payment_terms'],status:terms.status},{name:'build_booking_links',outcomeId:outcome.id,status:booking.status,availabilityRechecked:false}]};
    }catch(e){
      if(e.code?.startsWith('booking_fee_authority_'))this.workflowFailure=e.code;
      return {status:e instanceof ContractError?e.code:'tool_boundary_failed',details:e instanceof ContractError?e.details:{},ok:false};
    }
  }
}
