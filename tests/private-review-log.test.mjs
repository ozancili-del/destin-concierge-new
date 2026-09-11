import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {createReviewLogger} from '../lib/destiny-brain/review-log.js';

test('review logger appends the authorized 14-column record with RAW values',async()=>{
  const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
  const calls=[];
  const fetchImpl=async(url,options={})=>{
    calls.push({url:String(url),options});
    if(String(url).includes('oauth2.googleapis.com/token'))return {ok:true,json:async()=>({access_token:'synthetic-token'})};
    return {ok:true,status:200,json:async()=>({updates:{updatedRows:1}})};
  };
  const log=createReviewLogger({env:{GOOGLE_SERVICE_ACCOUNT_EMAIL:'synthetic@example.test',GOOGLE_PRIVATE_KEY:privateKey.export({type:'pkcs8',format:'pem'})},fetchImpl,spreadsheetId:'synthetic-sheet',tabName:'Destiny Brain Review',now:()=>new Date('2026-09-11T12:00:00Z')});
  const result=await log({anonymousSessionId:'anon',turnId:'turn',channel:'voice',question:'=synthetic question',answer:'Synthetic answer',links:['https://example.test'],tools:['weather'],responseTimeMs:123,hqRevision:'hq',brainVersion:'brain/v4',decisionId:'decision'});
  assert.deepEqual(result,{ok:true});assert.equal(calls.length,2);assert.match(calls[1].url,/Destiny%20Brain%20Review/);assert.match(calls[1].url,/valueInputOption=RAW/);
  const body=JSON.parse(calls[1].options.body);assert.equal(body.values.length,1);assert.equal(body.values[0].length,14);assert.equal(body.values[0][4],'=synthetic question');assert.match(body.values[0][6],/tool:weather/);
});

test('review logger stays disabled without the exact authorized tab',async()=>{
  const log=createReviewLogger({env:{},spreadsheetId:'sheet',tabName:'Other',fetchImpl:async()=>{throw Error('must not call');}});
  assert.deepEqual(await log({}),{ok:false,reason:'review_sheet_unconfigured'});
});
