// Formatting tolerance for model-quoted input spans only. No intent, entity,
// category, date or action inference. Never search prior turns for permission.
const pairs=new Map([['"','"'],["'","'"],['“','”'],['‘','’'],['«','»']]);
const spaces=s=>s.normalize('NFC').replace(/[“”]/gu,'"').replace(/[‘’]/gu,"'").replace(/[–—‑]/gu,'-').toLowerCase().split(/\s+/u).filter(Boolean).join(' ');
export function hasCurrentInputSpan(guest,evidence){
  if(typeof guest!=='string'||typeof evidence!=='string')return false;
  const current=spaces(guest);let span=spaces(evidence);
  if(!span)return false;
  // Require token boundaries: a quote of 3 cannot establish 13, nor can
  // 'send' establish 'resend'. Keep numbers, negation and word order intact.
  const contains=s=>{let at=current.indexOf(s);while(at!==-1){const before=current[at-1],after=current[at+s.length];if((!before||!/[\p{L}\p{N}_]/u.test(before))&&(!after||!/[\p{L}\p{N}_]/u.test(after)))return true;at=current.indexOf(s,at+1);}return false;};
  if(contains(span))return true;
  // Only a balanced outer quoting delimiter may be removed. Preserve internal
  // substantive punctuation, numbers and wording; mismatches remain non-matches.
  if(span.length>2&&pairs.get(span[0])===span.at(-1))span=spaces(span.slice(1,-1));
  else return false;
  return !!span&&contains(span);
}
