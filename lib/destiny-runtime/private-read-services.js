import {createServices} from '../destiny-agent/services.js';

const ORIGIN='https://www.destincondogetaways.com';
export function createPrivateReadServices({env=process.env,fetchImpl=fetch,now=()=>new Date()}={}){
 const services=createServices({env,fetchImpl,now,logger:{log(){},error(){}}});
 // The existing public read endpoint keeps credentials and reservation rows
 // on the production server. Only availability booleans enter this runtime.
 if(!env.OWNERREZ_API_TOKEN)services.checkBothUnits=async(arrival,departure)=>{
  const r=await fetchImpl(ORIGIN+'/api/destiny-voice-availability',{method:'POST',headers:{origin:ORIGIN,'content-type':'application/json'},body:JSON.stringify({arrival,departure,adults:2,children:0}),signal:AbortSignal.timeout(15000)});
  if(!r.ok)return {'707':null,'1006':null};const data=await r.json();
  return Object.fromEntries(['707','1006'].map(id=>{const u=data.units?.find(u=>u.unit===id);return[id,typeof u?.available==='boolean'?u.available:null];}));
 };
 // Public NWS forecast is an explicit fallback source, not a claim of Google
 // Weather parity. Null precipitation remains unknown rather than zero.
 if(!env.GOOGLE_WEATHER_API_KEY&&!env.GOOGLE_MAPS_KEY)services.fetchDestinWeather=async()=>{
  const headers={'User-Agent':'DestinyBluePrivateReview/3.0 (destincondogetaways.com)',Accept:'application/geo+json'};
  const point=await fetchImpl('https://api.weather.gov/points/30.3935,-86.4958',{headers,signal:AbortSignal.timeout(12000)});if(!point.ok)return {status:'unavailable',forecast:[]};
  const url=(await point.json()).properties?.forecast;if(typeof url!=='string'||new URL(url).hostname!=='api.weather.gov')return {status:'unavailable',forecast:[]};
  const r=await fetchImpl(url,{headers,signal:AbortSignal.timeout(12000)});if(!r.ok)return {status:'unavailable',forecast:[]};const data=await r.json(),days=new Map();
  for(const p of data.properties?.periods||[]){const date=String(p.startTime).slice(0,10);if(!days.has(date))days.set(date,{date,hi:null,lo:null,rain:null,desc:p.shortForecast});const d=days.get(date);if(Number.isFinite(p.temperature)){if(p.isDaytime)d.hi=p.temperature;else d.lo=p.temperature;}const rain=p.probabilityOfPrecipitation?.value;if(Number.isFinite(rain))d.rain=Math.max(d.rain??0,rain);}
  return {status:days.size?'success':'unavailable',forecast:[...days.values()],checkedAt:now().toISOString(),source:url,provider:'NWS public forecast'};
 };
 return services;
}
