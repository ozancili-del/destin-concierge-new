import fs from 'node:fs/promises';
import path from 'node:path';
import {assertPayloadSafe} from './accepted/vendor/privacy.mjs';
import {responseBounds,settleResponse,boundedWav} from './interactive-budget.js';
export function createBrokerOperations({apiKey,budget,fetchImpl=fetch,services={},reviewLogger=null}){
  const safe=value=>assertPayloadSafe(value,{apiKey});
  const provider=async(endpoint,body,json=true)=>{
    const response=await fetchImpl('https://api.openai.com/v1/'+endpoint,{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+apiKey,...(json?{'Content-Type':'application/json'}:{})},body:json?JSON.stringify(body):body,signal:AbortSignal.timeout(25000)});
    if(!response.ok)throw Error('provider_http_failure');return response;
  };
  return async(op,p)=>{
    if(op==='status')return budget.status();
    if(op==='responses'){
      safe(p);const bound=responseBounds(p);
      return budget.call('gpt-5.6-sol',bound.reserve,async row=>{
        await fs.writeFile(path.join(budget.root,row.id+'-request.json'),JSON.stringify(p));
        const result=await (await provider('responses',p)).json();safe(result);
        await fs.writeFile(path.join(budget.root,row.id+'-response.json'),JSON.stringify(result));
        if(result.status!=='completed')throw Error('incomplete_response');
        return {value:result,settledMicros:settleResponse(result.usage,bound),usage:result.usage};
      });
    }
    if(op==='transcribe'){
      const audio=boundedWav(p.wav);
      return budget.call('whisper-1',audio.reserve,async row=>{
        const body=new FormData();body.set('file',new Blob([audio.bytes],{type:'audio/wav'}),'private-input.wav');body.set('model','whisper-1');body.set('response_format','verbose_json');body.set('language','en');
        const result=await (await provider('audio/transcriptions',body,false)).json();safe(result);
        if(typeof result.text!=='string'||!Number.isFinite(result.duration)||result.duration>audio.seconds+1)throw Error('audio_usage_uncertain');
        await fs.writeFile(path.join(budget.root,row.id+'-transcript.json'),JSON.stringify({text:result.text,duration:result.duration}));
        return {value:{text:result.text},settledMicros:audio.reserve,usage:{durationSeconds:audio.seconds,billedSecondsUpperBound:Math.ceil(audio.seconds)+1,ratePerMinuteUsd:0.006}};
      });
    }
    if(op==='speech'){
      safe(p);if(typeof p.text!=='string'||!p.text.trim()||p.text.length>16000)throw Error('invalid_speech_text');
      const reserve=p.text.length*15,chunks=p.text.match(/[\s\S]{1,4000}/g);
      return budget.call('tts-1',reserve,async row=>{
        const clips=[];await fs.writeFile(path.join(budget.root,row.id+'-speech-request.json'),JSON.stringify(p));
        for(const [i,text]of chunks.entries()){
          const response=await provider('audio/speech',{model:'tts-1',voice:'nova',input:text,response_format:'mp3'});
          const bytes=Buffer.from(await response.arrayBuffer());if(!bytes.length)throw Error('empty_speech_response');
          await fs.writeFile(path.join(budget.root,row.id+'-speech-'+i+'.mp3'),bytes);clips.push(bytes.toString('base64'));
        }
        return {value:{clips,decisionId:p.decisionId},settledMicros:reserve,usage:{characters:p.text.length,apiRequests:chunks.length,ratePerMillionCharactersUsd:15}};
      });
    }
    if(op==='read'){
      if(!['checkBothUnits','findOpenWindows','fetchDestinWeather','fetchBeachConditions','fetchBeachDeals'].includes(p.method)||!Array.isArray(p.args)||p.args.length>3||JSON.stringify(p.args).length>2000)throw Error('read_not_allowed');
      safe(p);const result=await services[p.method](...p.args);safe(result);return result;
    }
    if(op==='review-log'){
      if(typeof reviewLogger!=='function')throw Error('review_logging_not_authorized');
      safe(p);return reviewLogger(p);
    }
    throw Error('broker_operation_denied');
  };
}
