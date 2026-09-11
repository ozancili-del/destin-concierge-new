import {createServices} from '../destiny-agent/services.js';

const DEFAULT_TAB='Destiny Brain Review';
const MAX_CELL=45000;
const cell=value=>String(value??'').slice(0,MAX_CELL);

export function createReviewLogger({env=process.env,fetchImpl=fetch,spreadsheetId=env.GOOGLE_SHEET_ID,tabName=DEFAULT_TAB,now=()=>new Date()}={}){
  const auth=createServices({env,fetchImpl,now,logger:{log(){},error(){}}});
  return async function logReviewTurn(payload={}){
    if(!spreadsheetId||tabName!==DEFAULT_TAB)return {ok:false,reason:'review_sheet_unconfigured'};
    const token=await auth.getSheetsToken(1);
    if(!token)return {ok:false,reason:'review_sheet_auth_failed'};
    const row=[payload.timestamp||now().toISOString(),payload.anonymousSessionId,payload.turnId,payload.channel,payload.question,payload.answer,[...(payload.links||[]),...(payload.tools||[]).map(x=>`tool:${x}`)].join('\n'),payload.responseTimeMs,payload.hqRevision,payload.brainVersion,payload.decisionId,'','',''].map(cell);
    const range=encodeURIComponent(`'${DEFAULT_TAB}'!A:N`);
    const response=await fetchImpl(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,{
      method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({values:[row]}),signal:AbortSignal.timeout(8000)
    });
    if(!response.ok)return {ok:false,reason:`review_sheet_http_${response.status}`};
    return {ok:true};
  };
}
