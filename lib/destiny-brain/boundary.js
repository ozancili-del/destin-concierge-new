export function privateBrainEnabled(env=process.env){return env.DESTINY_PRIVATE_RUNTIME==='1'&&!env.VERCEL_ENV;}
export function hasUntrustedForwarding(req){
  const names=['forwarded','x-forwarded-for','x-forwarded-host','x-forwarded-proto','x-forwarded-port','x-real-ip'];
  // Next adds forwarding headers to direct requests. rawHeaders retains what
  // actually arrived on the socket, so caller-supplied forwarding stays denied.
  const raw=req.rawHeaders;
  if(!Array.isArray(raw))return names.some(k=>req.headers[k]);
  if(raw.some((value,i)=>i%2===0&&names.includes(value.toLowerCase())))return true;
  const expected={'x-forwarded-for':req.socket.remoteAddress,'x-forwarded-host':req.headers.host,'x-forwarded-proto':'http','x-forwarded-port':String(req.headers.host).split(':')[1]||'80'};
  return names.some(k=>req.headers[k]!==undefined&&req.headers[k]!==expected[k]);
}
export function isPrivatePeer(req,env=process.env){
  return privateBrainEnabled(env)&&['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req?.socket?.remoteAddress)
    &&/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(String(req?.headers?.host||''))
    &&!hasUntrustedForwarding(req);
}
export const UNAVAILABLE_CAPABILITIES=Object.freeze(['owner_chat','relay','maintenance','lead','existing_booking','reservation_changes','external_persistence','targeted_web_search','current_events']);
export const PREVIEW_CONTEXT='PRIVATE PREVIEW CAPABILITIES: This preview cannot contact the owner, deliver messages or leads, send alerts, access an existing guest reservation, change reservations, or persist data to external services. These actions are unavailable; never claim delivery or success. Targeted web research and current-event searches are also unavailable in this first preview. Approved HQ contact information and non-side-effect links may still be provided when relevant. Read-only service failures must be described honestly. Do not list these limitations unless relevant to the guest request.';
