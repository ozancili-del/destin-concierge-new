import {createServices} from '../destiny-agent/services.js';
import {createPrivateReadServices} from '../destiny-runtime/private-read-services.js';

// Only these methods escape the provider layer. Booking records and credentials
// stay inside the original server adapter; no write or guest-record tool escapes.
export function createBrainReadServices({env=process.env,fetchImpl=fetch,now=()=>new Date(),signal}={}){
  const readFetch=(url,options={})=>{
    const parsed=new URL(url);if(parsed.protocol!=='https:')throw Error('private_service_https_required');
    const method=(options.method||'GET').toUpperCase();
    const semanticRead=method==='POST'&&parsed.origin==='https://www.destincondogetaways.com'&&parsed.pathname==='/api/destiny-voice-availability';
    if(method!=='GET'&&!semanticRead)throw Error('private_external_write_denied');
    return fetchImpl(url,{...options,signal:AbortSignal.any([AbortSignal.timeout(15000),...(signal?[signal]:[]),...(options.signal?[options.signal]:[])])});
  };
  const args={env,fetchImpl:readFetch,now,logger:{log(){},error(){}}};
  const original=createServices(args),withWeather=createPrivateReadServices(args);
  return Object.freeze({
    checkBothUnits:env.OWNERREZ_API_TOKEN?original.checkBothUnits:withWeather.checkBothUnits,
    findOpenWindows:env.OWNERREZ_API_TOKEN?original.findOpenWindows:async()=>{throw Error('private_calendar_unavailable');},
    fetchDestinWeather:withWeather.fetchDestinWeather,
    fetchBeachConditions:original.fetchBeachConditions,
    fetchBeachDeals:original.fetchBeachDeals,
  });
}
