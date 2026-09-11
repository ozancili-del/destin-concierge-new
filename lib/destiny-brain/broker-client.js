export async function brokerCall(op,payload={},env=process.env,signal){
  const url=env.DESTINY_PRIVATE_BROKER_URL,token=env.DESTINY_PRIVATE_BROKER_TOKEN;
  if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(url||'')||!token)throw Error('private_broker_unconfigured');
  const r=await fetch(url+'/'+op,{method:'POST',headers:{'Content-Type':'application/json','x-private-broker':token},body:JSON.stringify(payload),signal:signal||AbortSignal.timeout(op==='speech'?120000:45000)});
  const body=await r.json();if(!r.ok)throw Error(body.error||'private_broker_failed');return body;
}
export function brokerClient(env){return {responses:{create:(p,o={})=>brokerCall('responses',p,env,o.signal)}};}
export function brokerServices(env){return Object.fromEntries(['checkBothUnits','findOpenWindows','fetchDestinWeather','fetchBeachConditions','fetchBeachDeals'].map(method=>[method,(...args)=>brokerCall('read',{method,args},env)]));}
export function brokerReviewLogger(env){return payload=>brokerCall('review-log',payload,env);}
