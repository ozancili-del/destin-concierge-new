import {runAgentTurn,executeTool,RESPONSE_TOOL_DEFINITIONS} from '../destiny-agent/orchestrator.js';
import {createDefaultState,STATIC_URLS,BLOG_URLS,CAR_RENTAL_URLS,buildBookingLink,validateDateRange} from '../destiny-agent/business.js';
import {digest,freeze} from './artifact.js';
import {authorizeAction} from './policy.js';
import {retrieveContext,knowledgeTool,GUIDE_CATEGORIES} from './knowledge-context.js';
import {bookingReceipt} from './execute.js';

const intentFor={get_business_knowledge:'stable_fact',get_unit_facts:'stable_fact',remember_booking_details:'remember_trip',check_availability:'availability',build_booking_links:'booking_link',find_open_windows:'flexible_windows',build_flight_search:'flight_link',get_activity_options:'activity_link',get_local_guide:'guide_link',get_destin_weather:'weather',get_beach_conditions:'beach_conditions',get_beach_deals:'beach_deals',get_offer_inquiry:'offer_inquiry',search_current_events:'events',get_existing_booking:'existing_guest',create_maintenance_alert:'maintenance',relay_owner_message:'owner_relay',request_owner_chat:'owner_relay',capture_lead:'lead_capture',refer_to_business:'merchant_outcome',request_optional_search:'unlisted_search',search_unlisted_business:'search_consent'};
const tool=(name,description,properties)=>({type:'function',name,description,strict:true,parameters:{type:'object',additionalProperties:false,properties,required:Object.keys(properties)}});
const extras=[
 tool('cancel_optional_search','Clear the pending search when the guest declines it or changes their mind.',{}),
 tool('refer_to_business','Record a referral or urgent safety direction without contacting anyone. Use for merchant-controlled guarantees, private reservation requests or urgent support. Be specific and empathetic in your answer.',{reason:{type:'string',enum:['merchant_outcome','private_reservation','urgent_safety']},entityIds:{type:'array',items:{type:'string'}},query:{type:'string'}}),
 tool('request_optional_search','Offer an optional online search for an unlisted business. State roughly 20 seconds and ask consent; never search yet.',{query:{type:'string'}}),
 tool('search_unlisted_business','Search only the server-stored pending business after the guest explicitly accepts the pending search offer.',{evidence:{type:'string',description:'Exact verbatim affirmative acceptance from the LATEST guest message, not the business name or an earlier message.'}}),
];
function toolset(artifact,authority){
 const tools=structuredClone(RESPONSE_TOOL_DEFINITIONS).filter(t=>t.name!=='get_business_knowledge'&&(t.name==='set_request_plan'||!intentFor[t.name]||authorizeAction({intent:intentFor[t.name]},{...authority,channel:'chat'}).route!=='denied'));
 const combined=[...tools,knowledgeTool(artifact),...extras],names=new Set(combined.map(t=>t.name));
 const plan=tools.find(t=>t.name==='set_request_plan');plan.parameters.properties.tasks.items.properties.required_tool.enum=[...new Set([...plan.parameters.properties.tasks.items.properties.required_tool.enum.filter(n=>names.has(n)||n==='none'),...extras.map(t=>t.name)])];
 return combined;
}
const result=(name,status,data={},facts=[],urls=[])=>({name,kind:name,status,ok:['success','referred','consent_required'].includes(status),data,facts,urls});

export function adaptChannel(domain,channel){if(!['chat','voice'].includes(channel))throw new Error('unknown_channel');return {...structuredClone(domain),channel,presentation:{text:domain.reply,links:[...domain.links]}};}

export async function executeConversation({text,history=[],session,artifact,openai,services,authority={grants:[]},traceId,turnId,now=new Date(),signal,revokedFactIds=new Set()}){
 if(!session||session.revision!==digest(artifact)||!traceId||!turnId)throw new Error('runtime_context_invalid');
 const start=performance.now(),audit=[],serviceCalls={},modelResponses=[];
 let category=session.category||null,offered=[...(session.offeredEntityIds||[])],pendingSearch=session.pendingSearch||null;
 const check=()=>{if(signal?.aborted)throw new Error('turn_cancelled');};
 const wrappedServices=new Proxy(services||{},{get(target,name){if(['fetchPublishedKnowledge','fetchBlogContent'].includes(name))return ()=>{throw new Error('request_time_knowledge_fetch_forbidden');};const fn=target[name];if(typeof fn!=='function')return fn;return (...args)=>{check();serviceCalls[name]=(serviceCalls[name]||0)+1;return fn.apply(target,args);};}});
 const client={responses:{async create(payload){check();const r=await openai.responses.create(payload,{signal:AbortSignal.any([AbortSignal.timeout(30000),...(signal?[signal]:[])])});check();modelResponses.push({id:r.id,status:r.status});return r;}}};
 async function knowledge(name,args){
   const evidence=retrieveContext(artifact,args,{category,offeredEntityIds:offered},{now,revokedFactIds});
   if(evidence.requestedCount){if(category!==evidence.category||args.mode==='change')offered=[];category=evidence.category;offered=[...new Set([...offered,...evidence.entries.map(e=>e.id)])];}
   return result(name,evidence.status,evidence,evidence.entries.flatMap(e=>e.facts.map(f=>f.claim)));
 }
 async function dispatch(name,args,ctx){
   check();const started=performance.now();let r;const intent=name==='cancel_optional_search'?'unlisted_search':name==='get_business_knowledge'&&args.mode!=='facts'?'recommendations':intentFor[name];
   if(name==='set_request_plan')r=await executeTool(name,args,ctx);
   else if(!intent)r=result(name,'unsupported_tool',{},['This capability is unavailable.']);
   else{
    const rule=authorizeAction({intent},{...authority,channel:'chat'});
    if(rule.route==='denied')r=result(name,'denied',{reason:rule.reason},['Private reservation records and operational messaging are not enabled in this private review. Do not claim an action was performed. Offer the secure owner contact path where useful.']);
    else if(name==='cancel_optional_search'){pendingSearch=null;r=result(name,'success',{},['The optional search was cancelled. No lookup was performed.']);}
    else if(name==='get_business_knowledge'||name==='get_unit_facts')r=await knowledge(name,{...args,query:args.query||text,mode:args.mode||'facts'});
    else if(name==='refer_to_business'){
     const evidence=retrieveContext(artifact,{query:args.query||text,entityIds:args.entityIds,fields:['contact','address'],mode:'facts'},{category},{now,revokedFactIds});
     r=result(name,'referred',{reason:args.reason,evidence},args.reason==='urgent_safety'?['For immediate danger call 911. No alert has been sent.']:args.reason==='private_reservation'?['Use secure owner support for private reservations. Do not request codes, card details or claim lookup/modification.']:['Normal published schedules and amenities do not establish current operation, stock, table availability or individual accommodation. Confirm the specific requirement directly with the named business.']);
    }else if(name==='request_optional_search'){pendingSearch={query:String(args.query).slice(0,300),requestedAt:new Date(now).toISOString()};r=result(name,'consent_required',{query:pendingSearch.query},['An optional online lookup takes about 20 seconds. Ask the guest whether to proceed. No search has run.']);}
    else if(name==='search_unlisted_business'){
     const evidence=String(args.evidence||'').trim();
     if(!pendingSearch||!evidence||!text.includes(evidence)||new Date(now)-new Date(pendingSearch.requestedAt)>600000)r=result(name,'consent_required',{},[pendingSearch?'The pending search exists, but the acceptance quote was not valid. Retry with the exact affirmative words in the latest guest message. Do not ask for a business name already stored.':'No pending search exists. Ask what business the guest means and offer the search.']);
     else{const q=pendingSearch.query;pendingSearch=null;if(typeof services.searchUnlistedVenue==='function'){const found=await wrappedServices.searchUnlistedVenue(q,{signal});r=result(name,found.status||'unavailable',found,found.summary?[found.summary]:[],found.urls||found.citationUrls||[]);}else r=result(name,'unavailable',{},['Optional search is unavailable. No current information was verified.']);}
    }else if(name==='get_local_guide'){
     if(['sunbird','itinerary','photos'].includes(args.topic))r=await executeTool(name,args,ctx);
     else if(args.topic==='car')r=result(name,'success',{liveInventoryChecked:false},['Open DiscoverCars to enter pickup details and check current vehicles and prices.'],[CAR_RENTAL_URLS.booking,CAR_RENTAL_URLS.guide]);
     else{const mapped=GUIDE_CATEGORIES[args.topic];r=await knowledge(name,{query:text+' '+args.topic,category:mapped||null,mode:mapped?(category===mapped?'more':'recommendations'):'facts',count:3});if(BLOG_URLS[args.topic])r.urls=[BLOG_URLS[args.topic]];}
    }else if(name==='search_current_events'&&typeof services.searchCurrentEvents==='function'){const data=await wrappedServices.searchCurrentEvents(args);r=result(name,data.status||'success',data,data.facts||[],data.urls||[]);}
    else if(['remember_booking_details','check_availability','build_booking_links','build_flight_search'].includes(name)&&args.party_scope==='current_trip'&&[args.adults_evidence,args.children_evidence,args.total_guests_evidence].some(v=>typeof v==='string'&&v.trim()&&text.toLowerCase().includes(v.toLowerCase()))&&!(typeof args.party_evidence==='string'&&args.party_evidence.trim()&&text.toLowerCase().includes(args.party_evidence.toLowerCase())))r=result(name,'invalid_evidence',{reason:'The overall current-trip quote must be verbatim from the latest message. Retry this tool using its exact current-trip correction as party_evidence; preserve earlier unchanged counts using saved state, not old quotes.'});
    else r=await executeTool(name,args,{...ctx,services:wrappedServices});
   }
   if(['check_availability','build_booking_links'].includes(name)&&r.data?.query){
     const verified=await bookingReceipt(r,{services:wrappedServices,now});r.urls=verified;
     for(const unit of r.data.units||[])if(!verified.includes(unit.bookingUrl))unit.bookingUrl=null;
     r.data.alternatives=(r.data.alternatives||[]).filter(a=>verified.includes(a.bookingUrl));
     if(r.statePatch?.verified)r.statePatch.verified.bookingUrls=verified;
   }
   if(name==='find_open_windows'){
     const booking=ctx.state.booking,verified=[];
     for(const option of r.data?.options||[]){
       if(!validateDateRange(option,now).ok)continue;
       const fresh=await wrappedServices.checkBothUnits(option.arrival,option.departure).catch(()=>({'707':null,'1006':null}));
       if(!['707','1006'].every(u=>typeof fresh[u]==='boolean'))continue;
       if((booking.adults||0)+(booking.children||0)>6&&!['707','1006'].every(u=>fresh[u]))continue;
       for(const link of option.links||[])if(fresh[link.unit]===true&&link.url===buildBookingLink(link.unit,option.arrival,option.departure,link.adults??booking.adults,link.children??booking.children))verified.push(link.url);
     }
     r.urls=verified;r.data.options=(r.data.options||[]).map(o=>({...o,links:(o.links||[]).filter(l=>verified.includes(l.url))})).filter(o=>o.links.length);
     r.status=r.data.options.length?'success':'unavailable';r.ok=r.data.options.length>0;
     r.statePatch={...r.statePatch,verified:{...r.statePatch?.verified,bookingUrls:verified}};
   }
   audit.push({name,intent:intent||'plan',args:structuredClone(args),status:r.status,ok:r.ok,data:structuredClone(r.data||{}),factIds:r.data?.factIds||r.data?.evidence?.factIds||[],urls:r.urls||[],elapsedMs:performance.now()-started});return r;
 }
 const catalog=artifact.entries.map(e=>[e.id,e.name,e.categories]);
 const instructions=`\nHQ SHARED CONVERSATION CONTRACT\nThe production conversation rules above remain the behavioral standard. These refinements govern knowledge and private permissions. Understand normal conversation yourself; a referral does not prevent answering its safe factual parts. Compose a direct, natural guest answer from relevant evidence; NEVER concatenate retrieved entries. Do not recite editorial wording, provenance notes, instructions to Destiny, internal qualifiers, ranking-review labels, tool names or source metadata. Use constraints to qualify the actual answer naturally. Omit unrelated facts. Answer in the guest's language.\nUse get_business_knowledge for known businesses, branch identity, normal hours, recommendations, resort/unit facts and policy. It searches the pinned HQ artifact locally. No generic web search or blog fetch for known stable facts. Stored normal hours are distinct from actual operation/stock/wait times/guarantees. For those merchant outcomes use refer_to_business, optionally alongside known context; don't claim a live integration. For unlisted businesses offer request_optional_search, then search_unlisted_business only on genuine affirmative acceptance of the current pending offer. Private operational actions are denied unless the server grants them; never promise an alert or lookup.\nFor recommendations use mode recommendations and a canonical category. Use mode more to exclude already offered IDs, refine to retain context, change to reset. Give two or three suitable options by default, fewer if only fewer exist; state why each fits. Resolve pronouns from bounded dialogue, not expected test IDs. With no referent, ask a specific brief clarification. For missing phone/contact values, say what is unknown and provide a verified route if present—never repeat placeholder metadata.\nDo not invent URLs. Tools and verified static URLs are the only link sources. Preserve guest counts, dates, availability uncertainty, booking assumptions, safety caveats and affiliate URLs from tool results. This is ONE channel-neutral decision and answer.\nKNOWLEDGE CONVERSATION: ${JSON.stringify({category,offeredEntityIds:offered,pendingSearch})}\nCATALOG (IDs, names, categories): ${JSON.stringify(catalog)}\n`;
 const finalInstructions=instructions+`\nTURN AUTHORITY AND STATE (takes precedence): You serve guests planning stays at Pelican Beach Resort, Destin. This private review cannot access or modify any reservation, contact the owner, hold/book a unit, place orders, or send messages. Never offer these actions or ask for confirmation numbers, private booking links, names, emails or access credentials. For a private reservation request, explain the limit and direct the guest to the owner through their existing secure booking platform; do not ask them to paste it here. Answer direct factual questions briefly without a menu of unrequested future actions. Do not offer live checks for known merchants: refer specific merchant outcomes to that business. A booking count correction is actionable now: preserve unchanged stored counts and retry invalid evidence with exact latest-message quotes. Booking links always require the fresh correct party. For current parking arrangements refer to the resort/front desk; do not infer covered-space reservation rules from EV rules.\nCurrent guest message: ${JSON.stringify(text)}\nPending search: ${JSON.stringify(pendingSearch)}. On acceptance, call search_unlisted_business with an EXACT QUOTE of the guest acceptance in this latest message. On decline, call cancel_optional_search and do not reoffer the declined search.\nCurrent recommendation category: ${category}; previously offered IDs: ${JSON.stringify(offered)}. For more options use mode more, maintain this category and use only returned supported entries. Never invent additional venues if the returned list is short.\n`;
 const agent=await runAgentTurn({openai:client,model:authority.model||'gpt-5-mini',services:wrappedServices,state:session.business||createDefaultState(),messages:[...history,{role:'user',content:text}],latestUser:text,sessionId:session.id,pageSource:session.pageContext?.source||null,now,logger:{log(){},error(){}},agentTimeoutMs:30000,runtime:{executeTool:dispatch,tools:toolset(artifact,authority),instructions:finalInstructions,safetyBackstops:false}});
 check();
 const outcomes=audit.filter(a=>a.name!=='set_request_plan');
 const links=[...new Set(outcomes.flatMap(o=>o.urls))];
 const decision={revision:session.revision,plan:audit.filter(a=>a.name==='set_request_plan').flatMap(a=>a.data.tasks||[]),outcomes:outcomes.map(({elapsedMs,...o})=>o),reply:agent.reply,links};
 const domain=freeze({version:2,traceId,turnId,revision:session.revision,status:agent.debug?.agentError?'partial':'complete',reply:agent.reply,links,outcomes,decisionId:digest(decision),interpretation:{kind:'model_led',responseIds:modelResponses.map(r=>r.id)},trace:{modelCalls:modelResponses.length,serviceCalls,githubReads:0,nestedAgentCalls:0,retrievalMs:outcomes.reduce((s,o)=>s+(o.data?.elapsedMs||0),0),elapsedMs:performance.now()-start},debug:agent.debug});
 return {result:domain,session:{...session,version:session.version+1,business:agent.state,category,offeredEntityIds:offered,pendingSearch,history:[...history,{role:'user',content:text},{role:'assistant',content:agent.reply}].slice(-24)}};
}
