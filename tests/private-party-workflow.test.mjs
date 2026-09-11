import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PartyWorkflowRuntime,normalizePartyPatch,extraGuestTerms,WORKFLOW_TOOLS} from '../lib/destiny-brain/party-workflow.js';
import {runContractTurn} from '../lib/destiny-brain/workflow-runtime.js';
import {executePrivateBrain} from '../lib/destiny-brain/executor.js';
import {resolveParty,projectState} from '../lib/destiny-brain/accepted/kernel.mjs';
import {present,acceptAnswer} from '../lib/destiny-brain/accepted/answer.mjs';

const envelope=JSON.parse(await fs.readFile(new URL('../lib/destiny-brain/accepted/preview-envelope.json',import.meta.url),'utf8'));
const clock={now:'2026-09-11T12:00:00Z',timeZone:'America/Chicago',locale:'en-US'};
const party=(operation,values={},evidence='synthetic')=>({operation,adults:null,children_including_infants:null,non_infant_children:null,infants:null,total_guests:null,infants_mentioned:false,evidence,...values});
const timing=(kind='retain_stay',values={})=>({kind,start:null,end:null,offset_days:null,week_offset:null,weekdays:[],boundary:null,evidence:null,...values});
const outcome=(kind='knowledge',values={})=>({id:'request',kind,description:'Synthetic request',unit_ids:[],booking_operation:'refresh',booking_evidence:null,timing:timing(),unit_scope:null,origin_iata:null,origin_evidence:null,destination_iata:null,action_evidence:null,details:{guide_topic:null,event_category:null,severity:null,message:null,email:null,first_name:null,query:null},...values});
const options=state=>({artifact:envelope.artifact,publicKnowledge:envelope.publicKnowledge,state,clock});
async function active(){
  let checks=0;
  const services={checkBothUnits:async()=>{checks++;return {'707':true,'1006':true};}};
  const r=new PartyWorkflowRuntime({...options({booking:{adults:2,children:0,arrival:'2027-03-10',departure:'2027-03-15'}}),services,guest:'synthetic'});
  await r.tool('interpret_request',{base_revision:r.state.revision,party:party('retain'),outcomes:[outcome('booking',{unit_ids:['707'],unit_scope:'one'})]});
  const result=await r.tool('build_booking_links',{outcome_id:'request'});assert.equal(result.status,'success');
  return {state:projectState(r.state),services,checks:()=>checks};
}
async function update(f,operation,values,guest='synthetic',outcomes=[outcome()]){
  const r=new PartyWorkflowRuntime({...options(f.state),services:f.services,guest});
  const result=await r.tool('interpret_request',{base_revision:r.state.revision,party:party(operation,values,guest),outcomes});
  f.state=projectState(r.state);return {r,result};
}
test('sequential additions preserve adults/dates/unit and regenerate the current link without a check',async()=>{
  const f=await active(),original=f.state.contract.lodging.resources[f.state.contract.lodging.activeKey].lastSuccessfulObservation;
  const adult=await update(f,'add',{adults:1},'my sister is an adult');
  assert.equal(adult.result.completedBooking.status,'success');assert.equal(f.state.booking.adults,3);assert.equal(f.state.booking.children,0);
  const children=await update(f,'add',{children_including_infants:3},'ok 3 kids of my sisters will join also');
  assert.equal(f.checks(),1);assert.equal(children.result.completedBooking.data.availabilityConfirmedThisTurn,false);
  assert.deepEqual(children.result.completedBooking.links.map(l=>l.unit),['707']);
  const url=new URL(children.result.completedBooking.links[0].url);
  for(const [name,value]of Object.entries({or_adults:'3',or_children:'3',or_guests:'6',or_arrival:'2027-03-10',or_departure:'2027-03-15'}))assert.equal(url.searchParams.get(name),value);
  assert.deepEqual(children.result.completedBooking.data.lastSuccessfulObservation,original);
  assert.equal(children.result.bookingTerms.nightlySurchargeUsd,40);
  assert.equal(children.result.bookingTerms.previousNightlySurchargeUsd,0);
  assert.equal(children.result.bookingTerms.surchargeChanged,true);
  assert.equal(children.result.bookingTerms.includedInDisplayedRent,true);
  assert.equal(children.result.bookingTerms.hqRevision,envelope.hqRevision);
  const decision=acceptAnswer(children.r,'Your updated booking link is ready.');
  assert.equal(decision.links[0].url,url.href);
  const {channel:a,...chat}=present(decision,'chat'),{channel:b,...voice}=present(decision,'voice');assert.deepEqual(chat,voice);
});
test('clarification preserves confirmed counts, then applies the clarified adult once',async()=>{
  const f=await active();
  const ambiguous=await update(f,'ambiguous',{},'my sister decided to join us also');
  assert.equal(f.state.booking.adults,2);assert.equal(f.state.booking.children,0);assert.equal(ambiguous.result.completedBooking,undefined);
  await update(f,'add',{adults:1},'yes');assert.equal(f.state.booking.adults,3);assert.equal(f.checks(),1);
});
test('component correction/removal preserves unaffected counts and recomputes surcharge',async()=>{
  const f=await active();await update(f,'add',{adults:1});await update(f,'add',{children_including_infants:3});
  const corrected=await update(f,'patch',{children_including_infants:2});assert.equal(f.state.booking.adults,3);assert.equal(f.state.booking.children,2);assert.equal(corrected.result.bookingTerms.nightlySurchargeUsd,20);
  const removed=await update(f,'remove',{adults:1});assert.equal(f.state.booking.adults,2);assert.equal(f.state.booking.children,2);assert.equal(removed.result.bookingTerms.nightlySurchargeUsd,0);assert.equal(f.checks(),1);
});
test('seven occupants invalidate the old single-unit link and cannot bypass the six-person limit',async()=>{
  const f=await active();await update(f,'add',{adults:1});const {result,r}=await update(f,'add',{children_including_infants:4});
  assert.equal(result.completedBooking.status,'occupancy_exceeded');assert.equal(result.bookingTerms.maximumGuests,6);assert.deepEqual(f.state.booking.linkUrls,[]);assert.equal(f.checks(),1);
  const repeated=await r.tool('check_availability',{outcome_id:result.completedBooking.outcomeId});assert.equal(repeated.status,'occupancy_exceeded');assert.equal(f.checks(),1);
});
test('infants count once; unknown and inconsistent patch components fail safely',()=>{
  const previous=resolveParty(party('replace',{adults:2,children_including_infants:0}),'','synthetic');
  const next=resolveParty(normalizePartyPatch(party('add',{non_infant_children:2,infants:1,infants_mentioned:true}),previous,'synthetic'),previous,'synthetic');
  assert.equal(next.total,5);assert.equal(next.childrenIncludingInfants,3);assert.equal(next.infants,1);assert.equal(next.nonInfantChildren,2);
  assert.throws(()=>normalizePartyPatch(party('remove',{adults:3}),previous,'synthetic'),/invalid_party_count/);
  assert.throws(()=>normalizePartyPatch(party('add',{adults:1,total_guests:3}),previous,'synthetic'),/inconsistent_party_total/);
  assert.throws(()=>normalizePartyPatch(party('add',{adults:1}),{...previous,adults:null},'synthetic'),/needs_party_clarification/);
});
test('fee arithmetic is compiled from approved HQ text and refuses missing/unrecognized authority',()=>{
  const facts=structuredClone(envelope.publicKnowledge.bookingPackages);
  assert.equal(extraGuestTerms(facts,6).nightlySurchargeUsd,40);
  const fact=facts.find(p=>p.id==='booking_payment_terms').facts.find(f=>f.id==='booking_additional_guest_pricing_owner');
  fact.text=fact.text.replace('$20','$25');assert.equal(extraGuestTerms(facts,6).nightlySurchargeUsd,50);
  fact.text='Unknown fee';assert.throws(()=>extraGuestTerms(facts,6),/unrecognized/);
  assert.throws(()=>extraGuestTerms([],6),/missing/);
});
test('dates or unit changes always use the established fresh-check path',async()=>{
  for(const which of ['date','unit']){
    const f=await active();
    const o=outcome('booking',{unit_ids:[which==='unit'?'1006':'707'],unit_scope:'one',booking_operation:'link_only',booking_evidence:'synthetic',timing:which==='date'?timing('exact_range',{start:'2027-04-10',end:'2027-04-15',evidence:'synthetic'}):timing()});
    const {r,result}=await update(f,'add',{adults:1},'synthetic',[o]);assert.equal(result.completedBooking,undefined);
    const checked=await r.tool('build_booking_links',{outcome_id:'request'});assert.equal(checked.status,'success');assert.equal(checked.data.availabilityConfirmedThisTurn,true);assert.equal(f.checks(),2);
  }
});
test('explicit refresh remains a fresh check even when the party changes',async()=>{
  const f=await active();const {r,result}=await update(f,'add',{adults:1},'synthetic',[outcome('booking',{unit_ids:['707'],unit_scope:'one',booking_operation:'refresh'})]);
  assert.equal(result.completedBooking,undefined);const checked=await r.tool('check_availability',{outcome_id:'request'});assert.equal(checked.data.availabilityConfirmedThisTurn,true);assert.equal(f.checks(),2);
});
test('mixed requests complete the party link first while retaining independent requested outcomes',async()=>{
  const f=await active();const weather=outcome('weather',{id:'weather',timing:timing('relative_day',{offset_days:1,evidence:'synthetic'})});
  const {r,result}=await update(f,'add',{adults:1},'synthetic',[outcome(),weather]);
  assert.equal(result.completedBooking.status,'success');assert.ok(r.outcomes.some(o=>o.id==='weather'));assert.equal(f.checks(),1);
});
test('missing HQ fee authority does not commit a half-completed party/link update',async()=>{
  const f=await active(),r=new PartyWorkflowRuntime({...options(f.state),guest:'synthetic',services:f.services});
  r.packages=()=>({knowledgeState:'verified_empty',packages:[]});
  const result=await r.tool('interpret_request',{base_revision:r.state.revision,party:party('add',{adults:1}),outcomes:[outcome()]});
  assert.equal(result.status,'booking_fee_authority_missing');assert.equal(r.workflowFailure,'booking_fee_authority_missing');assert.equal(r.state.party.adults,2);
  assert.deepEqual(projectState(r.state).booking.linkUrls,f.state.booking.linkUrls);assert.equal(f.checks(),1);
});
test('party-only updates with an explicit link outcome replay completed action without extra checks',async()=>{
  const f=await active();const {r,result}=await update(f,'add',{adults:1},'synthetic',[outcome('booking',{booking_operation:'link_only',booking_evidence:'synthetic'})]);
  assert.equal(result.completedBooking.links[0].unit,'707');
  const repeated=await r.tool('build_booking_links',{outcome_id:'request'});assert.deepEqual(repeated,result.completedBooking);assert.equal(f.checks(),1);
});
test('no active link means a party change does not invent a booking action; ordinary replies stay model-led',async()=>{
  const r=new PartyWorkflowRuntime({...options({booking:{adults:2,children:0}}),guest:'synthetic'});
  const result=await r.tool('interpret_request',{base_revision:r.state.revision,party:party('add',{adults:1}),outcomes:[outcome()]});
  assert.equal(r.state.party.adults,3);assert.equal(result.completedBooking,undefined);
  const final=await runContractTurn({...options({}),guest:'Hello',client:{responses:{create:async()=>({status:'completed',output_text:'Hello! How can I help?',output:[]})}}});assert.equal(final.reply,'Hello! How can I help?');assert.equal(final.failure,null);
});
test('private executor composes once after automatic link/fee completion and shares Chat/Voice decisions',async()=>{
  const f=await active();await update(f,'add',{adults:1});let rounds=0;
  const text='ok 3 kids of my sisters will join also';
  const answer='That brings you to 3 adults and 3 children. Here’s your updated Unit 707 booking link for March 10–15. The two guests above four add $40 per night, included in the displayed rent.';
  const openai={responses:{create:async request=>{
    rounds++;assert.deepEqual(request.tools,WORKFLOW_TOOLS);
    if(rounds===1)return {status:'completed',output:[{type:'function_call',name:'interpret_request',call_id:'party',arguments:JSON.stringify({base_revision:f.state.contract.revision,party:party('add',{children_including_infants:3},text),outcomes:[outcome()]})}]};
    const result=JSON.parse(request.input.find(m=>m.type==='function_call_output').output);
    assert.equal(result.bookingTerms.nightlySurchargeUsd,40);assert.equal(result.completedBooking.links.length,1);
    assert.ok(request.input.some(m=>m.role==='developer'&&m.content.includes('SCOPED APPROVED HQ KNOWLEDGE')&&m.content.includes('booking_additional_guest_pricing_owner')));
    return {status:'completed',output:[],output_text:answer};
  }}};
  const result=await executePrivateBrain({text,session:{id:'synthetic',version:0,revision:envelope.revision,brainState:f.state},artifact:envelope,openai,services:f.services,clockProvider:()=>clock});
  assert.equal(result.result.reply,answer);assert.equal(result.result.links.length,1);assert.equal(rounds,2);assert.equal(f.checks(),1);assert.equal(result.result.failure,null);
  assert.equal(result.result.presentations.chat.decisionHash,result.result.presentations.voice.decisionHash);
  assert.deepEqual(result.result.presentations.chat.links,result.result.presentations.voice.links);
});
