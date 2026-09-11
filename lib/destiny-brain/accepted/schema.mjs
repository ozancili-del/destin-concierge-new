import {ContractError} from './kernel.mjs';
import {TRIPSHOCK_CATEGORIES} from './vendor/business.mjs';
export const str={type:'string'}, nullableString={type:['string','null']};
const count={type:['integer','null'],minimum:0,maximum:100};
export const object=properties=>({type:'object',additionalProperties:false,properties,required:Object.keys(properties)});
const list=(items,minItems=0,maxItems=20)=>({type:'array',items,minItems,maxItems});
const choice=values=>({type:'string',enum:values});
const fn=(name,description,parameters)=>({type:'function',name,description,parameters,strict:true});
export const DATE_SCHEMA=object({kind:choice(['unknown','ambiguous','exact_day','exact_range','relative_day','calendar_week','week_part','retain_stay','retain_flight','shift_stay','clarify_shift']),start:nullableString,end:nullableString,offset_days:{type:['integer','null'],minimum:-366,maximum:366},week_offset:{type:['integer','null'],minimum:-52,maximum:52},weekdays:list({type:'integer',minimum:0,maximum:6},0,7),boundary:{type:['string','null'],enum:['checkin','checkout','whole_stay',null]},evidence:nullableString});
export const PARTY_SCHEMA=object({operation:choice(['retain','replace','ambiguous']),adults:count,children_including_infants:count,non_infant_children:count,infants:count,total_guests:count,infants_mentioned:{type:'boolean'},evidence:nullableString});
export const KINDS=['conversation','knowledge','availability','booking','weather','beach','flight','activity','deals','guide','events','owner_chat','relay','maintenance','lead','existing_booking','search'];
export const DETAILS_SCHEMA=object({guide_topic:{type:['string','null'],enum:['car','itinerary','sunbird','photos',null]},event_category:{type:['string','null'],enum:['events','music','both','fireworks',null]},severity:{type:['string','null'],enum:['maintenance','emergency',null]},message:nullableString,email:nullableString,first_name:nullableString,query:nullableString});
export const OUTCOME_SCHEMA=object({id:{...str,minLength:1,maxLength:60},kind:choice(KINDS),description:{...str,minLength:1,maxLength:300},unit_ids:list(choice(['707','1006']),0,2),booking_operation:choice(['refresh','link_only','reported_unavailable','alternatives']),booking_evidence:nullableString,timing:DATE_SCHEMA,unit_scope:{type:['string','null'],enum:['one','two','either',null]},origin_iata:nullableString,origin_evidence:nullableString,destination_iata:{type:['string','null'],enum:['VPS','PNS','ECP',null]},action_evidence:nullableString,details:DETAILS_SCHEMA});
const outcomeArg={outcome_id:{...str,minLength:1,maxLength:60}};
export const TOOLS=[
 fn('interpret_request','Interpret the complete conversation once. Declare each outcome, scoped current party and semantic calendar operation. Plans describe requests; they are never verified facts.',object({base_revision:str,party:PARTY_SCHEMA,outcomes:list(OUTCOME_SCHEMA,1,12)})),
 fn('get_hq_packages','Select exact package IDs from the complete coverage index and load whole packages. Only data contains factual support; unknown or verified_empty allows another package/context lookup.',object({entity_ids:list(str,1,12)})),
 fn('get_hq_pricing','Retrieve approved conditional pricing only when you determine the guest asks about price, affordability, value or a relevant practical fee. State your semantic reason. This does not fetch live prices. Never use this for an ordinary non-price comparison. Internal pricing is never returned.',object({entity_ids:list(str,1,12),relevance:{...str,minLength:1,maxLength:400}})),
 fn('get_hq_booking_terms','Retrieve approved booking payment, deposit, tax, extra-guest and cancellation terms only for a genuine booking question or booking context. State the semantic reason. These terms do not apply universally to marketplace reservations.',object({entity_ids:list(str,1,12),relevance:{...str,minLength:1,maxLength:400}})),
 fn('browse_hq','Optional exact-topic catalog lookup. Use only catalog topic names, never invented subjects. Empty input returns the full topic directory; a miss returns unknown and the complete valid index. Prefer exact package selection from the coverage index.',object({topics:list(str,0,12)})),
 ...['check_availability','build_booking_links','get_destin_weather','get_beach_conditions','build_flight_search','get_beach_deals','get_guide_link','search_current_events','request_owner_chat','relay_owner_message','create_maintenance_alert','capture_lead','get_existing_booking'].map(name=>fn(name,'Execute the matching interpreted outcome. Uses the canonical party/date revision; cannot accept alternate raw counts or dates.',object(outcomeArg))),
 fn('find_open_windows','Find equal-length exact-date alternatives within the interpreted trip and supplied flexibility. No period becomes an exact stay.',object({...outcomeArg,flexibility_days:{type:'integer',minimum:0,maximum:30}})),
 fn('get_activity_options','Build a canonical activity affiliate link; this does not check ticket inventory.',object({...outcomeArg,category:choice(Object.keys(TRIPSHOCK_CATEGORIES))})),
 fn('offer_targeted_search','Record an offer; do not search before a later explicit confirmation.',object({...outcomeArg,entity:str,query:str})),
 fn('search_unknown_entity','Use the exact pending offer after explicit guest confirmation in a later turn.',object({...outcomeArg,offer_id:str,confirmation_quote:str})),
];

// Structural normalization only; no guest-language classification.
const enumKey=s=>s.normalize('NFKC').trim().toLowerCase().split('-').join('_').split(' ').join('_');
export function validate(schema,value,path='$') {
  const fail=code=>{throw new ContractError(code,{path});};
  if(schema.enum){if(schema.enum.includes(value))return value;const normalized=typeof value==='string'?schema.enum.find(v=>typeof v==='string'&&enumKey(v)===enumKey(value)):undefined;if(normalized!==undefined)return normalized;fail('invalid_enum');}
  const types=Array.isArray(schema.type)?schema.type:[schema.type];
  if(value===null){if(types.includes('null'))return null;fail('invalid_type');}
  const actual=Array.isArray(value)?'array':typeof value;
  if(!types.includes(actual)&&!(types.includes('integer')&&Number.isInteger(value)))fail('invalid_type');
  if(typeof value==='number'){if(!Number.isFinite(value)||schema.minimum!=null&&value<schema.minimum||schema.maximum!=null&&value>schema.maximum)fail('out_of_range');}
  if(typeof value==='string'){if(schema.minLength!=null&&value.length<schema.minLength||schema.maxLength!=null&&value.length>schema.maxLength)fail('invalid_length');}
  if(Array.isArray(value)){if(schema.minItems!=null&&value.length<schema.minItems||schema.maxItems!=null&&value.length>schema.maxItems)fail('invalid_cardinality');return value.map((v,i)=>validate(schema.items,v,path+'.'+i));}
  if(actual==='object') {
    for(const k of schema.required||[])if(!Object.hasOwn(value,k))fail('missing_field');
    const out={};for(const k of Object.keys(value)){if(!Object.hasOwn(schema.properties||{},k))fail('unknown_field');out[k]=validate(schema.properties[k],value[k],path+'.'+k);}return out;
  }
  return value;
}
