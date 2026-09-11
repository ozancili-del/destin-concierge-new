import {hash,requireContract,ContractError,providerParty,eligibleUnit,validSplits,actionDates,assertState} from './kernel.mjs';

export async function executeBooking(engine,name,args) {
  const o=engine.outcome(args.outcome_id,['availability','booking']);
  engine.setStay(o.dates);
  const party=providerParty(engine.state.party),eligibility=eligibleUnit(engine.state.party);
  let splits=[];
  if(!eligibility.ok){
    if(o.unit_scope==='one'||o.unit_scope!=='two'&&party.total<=6)throw new ContractError(eligibility.reason);
    splits=validSplits(engine.state.party);requireContract(splits.length,party.total>12?'occupancy_exceeded':'no_valid_two_unit_split');
  }else if(o.unit_scope==='two'){splits=validSplits(engine.state.party);requireContract(splits.length,'no_valid_two_unit_split');}
  const query={...actionDates(o.dates,engine.clock),...party,partyRevision:hash(engine.state.party)};
  const resourceQuery={arrival:query.arrival,departure:query.departure,units:[...new Set(o.unit_ids.length?o.unit_ids:['707','1006'])].sort()};
  const key=hash(resourceQuery),prior=engine.state.lodging.resources[key];
  const resource=structuredClone(prior||{key,query:resourceQuery,lastSuccessfulObservation:null,latestAttempt:null,linkBundle:null,guestReport:null});
  const linksFor=(vacancy,dates=o.dates)=>engine.links(vacancy,dates,splits,o.unit_ids);
  const allVacant=Object.fromEntries(resourceQuery.units.map(u=>[u,true]));
  const commit=()=>{
    const resources={...engine.state.lodging.resources,[key]:resource};
    const keys=Object.keys(resources);for(const old of keys.slice(0,Math.max(0,keys.length-8)))if(old!==key)delete resources[old];
    engine.state={...engine.state,lodging:{activeKey:key,resources}};assertState(engine.state);
  };
  const bundle=links=>({valid:true,partyRevision:hash(engine.state.party),query,requiresTwoUnits:splits.length>0,links,generatedAt:engine.clock.now});
  const result=(status,data,links)=>{
    commit();return engine.add('availability',o.id,status,{...data,calendarOnly:true,requiresTwoUnits:splits.length>0,resourceKey:key,lastSuccessfulObservation:resource.lastSuccessfulObservation,latestAttempt:resource.latestAttempt,linkReusable:links.length>0},{query,resourceKey:key,links});
  };
  const attemptId=hash({key,turn:engine.state.concierge.turn,sequence:engine.sequence+1,operation:name});
  if(o.booking_operation==='reported_unavailable')resource.guestReport={status:'reported_unavailable',reportedAt:engine.clock.now,evidence:o.booking_evidence};
  if(name==='find_open_windows') {
    requireContract(Number.isInteger(args.flexibility_days)&&args.flexibility_days>=0&&args.flexibility_days<=30,'invalid_flexibility');
    let windows;
    try{windows=await engine.call('findOpenWindows',{targetArrival:query.arrival,targetDeparture:query.departure,flexibilityDays:args.flexibility_days});}
    catch{resource.latestAttempt={id:attemptId,operation:'alternatives',status:'failed',checkedAt:engine.clock.now};return result('refresh_failed',{availabilityConfirmedThisTurn:false,options:[]},[]);}
    requireContract(Array.isArray(windows),'invalid_service_result');
    const options=[];
    for(const w of windows){
      const dates={status:'resolved',precision:'exact',start:w.arrival,end:w.departure,source:'calendar_availability'};actionDates(dates,engine.clock);
      requireContract(Math.abs(Date.parse(w.arrival)-Date.parse(query.arrival))/86400000<=args.flexibility_days&&Date.parse(w.departure)-Date.parse(w.arrival)===Date.parse(query.departure)-Date.parse(query.arrival),'unrequested_alternative');
      requireContract(w.units&&['707','1006'].every(u=>typeof w.units[u]==='boolean'),'availability_unknown');
      const links=linksFor(w.units,dates);if(links.length)options.push({dates,vacancy:w.units,links});
    }
    resource.latestAttempt={id:attemptId,operation:'alternatives',status:'success',checkedAt:engine.clock.now};
    // Alternatives are observations of their own dates, never of the original query.
    return result(options.length?'success':'unavailable',{options,availabilityConfirmedThisTurn:true},options.flatMap(x=>x.links));
  }
  // The model interprets reuse vs refresh. Code validates its semantic resource.
  // A count-only change preserves the calendar observation but rebuilds all URLs.
  if(o.booking_operation==='link_only'&&prior&&engine.state.lodging.activeKey===key){
    const vacancy=prior.linkBundle?.links.length?Object.fromEntries(prior.linkBundle.links.map(l=>[l.unit,true])):prior.lastSuccessfulObservation?.vacancy||allVacant;
    const links=linksFor(vacancy);resource.linkBundle=bundle(links);
    return result(links.length?'success':'unavailable',{delivery:'link_only',availabilityConfirmedThisTurn:false,vacancy:prior.lastSuccessfulObservation?.vacancy||null},links);
  }
  let vacancy;
  try{vacancy=await engine.call('checkBothUnits',query.arrival,query.departure);requireContract(vacancy&&['707','1006'].every(u=>typeof vacancy[u]==='boolean'),'availability_unknown');}
  catch{
    resource.latestAttempt={id:attemptId,operation:'availability',status:'failed',checkedAt:engine.clock.now};
    // A technical refresh failure changes observation status, not checkout URL validity.
    const links=linksFor(prior?.linkBundle?.links.length?Object.fromEntries(prior.linkBundle.links.map(l=>[l.unit,true])):allVacant);
    resource.linkBundle=bundle(links);
    return result('refresh_failed',{availabilityConfirmedThisTurn:false},links);
  }
  resource.latestAttempt={id:attemptId,operation:'availability',status:'success',checkedAt:engine.clock.now};
  resource.lastSuccessfulObservation={query:resourceQuery,vacancy,checkedAt:engine.clock.now,attemptId};
  resource.guestReport=null;
  const links=linksFor(vacancy);resource.linkBundle=bundle(links);
  return result(links.length?'success':'unavailable',{vacancy,availabilityConfirmedThisTurn:true,partyEligible:true},links);
}
