import {resolveParty,calendar,transition,stable,requireContract} from './kernel.mjs';
import {hasCurrentInputSpan} from './input-provenance.mjs';
export const interpretRequest = function(args) {
    requireContract(!this.actionsStarted,'interpretation_locked_after_action');
    requireContract(args.base_revision===this.state.revision,'stale_interpretation');
    const ids=args.outcomes.map(o=>o.id);requireContract(new Set(ids).size===ids.length,'duplicate_outcome_id');
    const party=resolveParty(args.party,this.state.party,this.guest);
    const outcomes=args.outcomes.map(o=>{
      // Browse links perform no reservation or delivery. The model may use the
      // complete conversation for these dates; requiring a current-turn quote
      // erased remembered activity dates and blocked unrelated guide requests.
      const browsing=['activity','guide'].includes(o.kind);
      if(!browsing&&!['unknown','retain_stay','retain_flight'].includes(o.timing.kind))requireContract(hasCurrentInputSpan(this.guest,o.timing.evidence),'date_evidence_required');
      if(!browsing&&o.origin_iata)requireContract(hasCurrentInputSpan(this.guest,o.origin_evidence),'origin_evidence_required');
      if(['owner_chat','relay','maintenance','lead'].includes(o.kind))requireContract(hasCurrentInputSpan(this.guest,o.action_evidence),'action_evidence_required');
      if(o.kind==='lead')requireContract(o.details.email&&this.guest.includes(o.details.email),'email_evidence_required');
      if(['booking','availability'].includes(o.kind)&&['link_only','reported_unavailable'].includes(o.booking_operation))requireContract(hasCurrentInputSpan(this.guest,o.booking_evidence),'booking_evidence_required');
      return {...o,...(o.kind==='flight'?{origin_iata:o.origin_iata||this.state.flight?.origin||null,destination_iata:o.destination_iata||this.state.flight?.destination||'VPS'}:{}),dates:calendar(o.timing,this.clock,this.state.stay,this.state.flight)};
    });
    const exactStays=outcomes.filter(o=>['availability','booking'].includes(o.kind)&&o.dates.precision==='exact').map(o=>o.dates);
    requireContract(exactStays.every(d=>stable(d)===stable(exactStays[0])),'conflicting_stay_operations');
    const flights=outcomes.filter(o=>o.kind==='flight').map(o=>({...o.dates,origin:o.origin_iata,destination:o.destination_iata||'VPS'}));
    requireContract(flights.every(d=>stable(d)===stable(flights[0])),'conflicting_flight_operations');
    this.state=transition(this.state,{party,...(exactStays.length?{stay:exactStays[0]}:{}),...(flights.length?{flight:flights[0]}:{})});
    this.outcomes=outcomes;this.engine.state=this.state;this.engine.outcomes=outcomes;this.engine.invalidate();
    for(const [id,r]of this.engine.evidence)if(r.kind==='calendar')this.engine.evidence.delete(id);
    for(const o of outcomes)this.engine.add('calendar',o.id,'success',o.dates);
    return {status:'interpreted',revision:this.state.revision,party:this.state.party,outcomes:this.outcomes,evidence:[...this.engine.evidence.values()].filter(r=>r.kind==='calendar')};
};
