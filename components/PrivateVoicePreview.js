import Head from 'next/head';
import {useEffect,useRef,useState} from 'react';
import PrivatePreviewBudget from './PrivatePreviewBudget';
function encodeWav(audio){
 const count=Math.min(480000,Math.floor(audio.duration*16000)),data=new ArrayBuffer(44+count*2),v=new DataView(data),source=audio.getChannelData(0);
 const ascii=(at,s)=>[...s].forEach((c,i)=>v.setUint8(at+i,c.charCodeAt(0)));
 ascii(0,'RIFF');v.setUint32(4,data.byteLength-8,true);ascii(8,'WAVE');ascii(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,16000,true);v.setUint32(28,32000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);ascii(36,'data');v.setUint32(40,count*2,true);
 for(let i=0;i<count;i++){const sample=Math.max(-1,Math.min(1,source[Math.floor(i*audio.sampleRate/16000)]||0));v.setInt16(44+i*2,sample<0?sample*32768:sample*32767,true);}
 let binary='';const bytes=new Uint8Array(data);for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(binary);
}
const SESSION_KEY='destiny_private_preview_session_v1';
function linkLabel(url){if(/unit-707/i.test(url))return 'View Unit 707';if(/unit-1006/i.test(url))return 'View Unit 1006';if(/tripshock/i.test(url))return 'Browse activities';if(/discovercars/i.test(url))return 'Compare rental cars';if(/aviasales/i.test(url))return 'View flight options';return 'Open recommended page';}
export default function PrivateVoicePreview({enabled,hosted=false}){
 const [text,setText]=useState(''),[status,setStatus]=useState('Ready. Record a question or type it below.'),[busy,setBusy]=useState(false),[recording,setRecording]=useState(false),[turns,setTurns]=useState([]);
 const recorder=useRef(),stream=useRef(),timer=useRef(),audio=useRef(),urls=useRef([]),sessionToken=useRef(null);
 useEffect(()=>{if(hosted)sessionToken.current=sessionStorage.getItem(SESSION_KEY);},[hosted]);
 useEffect(()=>()=>{clearTimeout(timer.current);stream.current?.getTracks().forEach(t=>t.stop());audio.current?.pause();urls.current.forEach(URL.revokeObjectURL);},[]);
 async function json(url,body){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),result=await r.json();if(!r.ok)throw Error(result.error||'private_request_unavailable');return result;}
 async function answer(question){
  if(!question.trim())return;setBusy(true);setStatus('Destiny is thinking…');audio.current?.pause();
  try{const result=await json('/api/destiny-private-voice',{text:question,turnId:crypto.randomUUID(),...(hosted&&sessionToken.current?{sessionToken:sessionToken.current}:{})});if(hosted&&result.sessionToken){sessionToken.current=result.sessionToken;sessionStorage.setItem(SESSION_KEY,result.sessionToken);}setTurns(t=>[...t,{question,result}]);setText('');
   if(result.failure){setStatus('Stopped: '+result.failure);return;}
   setStatus('Preparing speech…');const speech=await json('/api/destiny-private-audio',{op:'speech',decisionId:result.decisionId,...(hosted&&sessionToken.current?{sessionToken:sessionToken.current}:{})});
   urls.current.forEach(URL.revokeObjectURL);urls.current=speech.clips.map(b=>URL.createObjectURL(new Blob([Uint8Array.from(atob(b),c=>c.charCodeAt(0))],{type:'audio/mpeg'})));
   let i=0;audio.current.src=urls.current[0];audio.current.onended=()=>{if(++i<urls.current.length){audio.current.src=urls.current[i];audio.current.play().catch(()=>setStatus('Press play to hear the next part.'));}else setStatus('Ready for your next question.');};
   await audio.current.play().catch(()=>setStatus('Your answer is ready. Press play to hear it.'));setStatus('Answer ready.');
  }catch(e){setStatus('Stopped: '+e.message);}finally{setBusy(false);}
 }
 async function record(){
  if(recording){recorder.current.stop();return;}
  try{stream.current=await navigator.mediaDevices.getUserMedia({audio:true});const chunks=[];recorder.current=new MediaRecorder(stream.current);recorder.current.ondataavailable=e=>chunks.push(e.data);
   recorder.current.onstop=async()=>{clearTimeout(timer.current);stream.current.getTracks().forEach(t=>t.stop());setRecording(false);setBusy(true);setStatus('Transcribing…');let context;
    try{context=new AudioContext();const decoded=await context.decodeAudioData(await new Blob(chunks).arrayBuffer());const result=await json('/api/destiny-private-audio',{op:'transcribe',wav:encodeWav(decoded)});setText(result.text);await answer(result.text);}catch(e){setStatus('Stopped: '+e.message);}finally{await context?.close();setBusy(false);}
   };recorder.current.start();setRecording(true);setStatus('Recording — maximum 30 seconds.');timer.current=setTimeout(()=>{if(recorder.current?.state==='recording')recorder.current.stop();},30000);
  }catch{setStatus('Microphone access is unavailable. You can type a question instead.');}
 }
 return <main style={{maxWidth:760,margin:'40px auto',padding:24,fontFamily:'system-ui',lineHeight:1.6}}>
  <Head><title>Destiny private Voice preview</title><meta name="robots" content="noindex,nofollow"/></Head>
  <h1>Destiny private Voice</h1><p><a href="/destiny-private">Continue this conversation in Chat</a></p>{hosted?<p role="status">Hosted synthetic review · production remains unchanged</p>:<PrivatePreviewBudget/>}
  <p>Push-to-talk preview. Speech uses the same facts and decision as Chat, while links appear as buttons and are never read aloud. You are hearing an AI-generated voice.</p>
  <p>Use synthetic questions. Do not speak guest records, passwords, access codes or payment information. Owner contact, alerts and other external writes are unavailable.</p>
  {!enabled&&<p>Voice model calls are disabled for this nonbillable preview.</p>}
  <button onClick={record} disabled={!enabled||busy}>{recording?'Stop recording':'Record a question'}</button><p role="status">{status}</p>
  <form onSubmit={e=>{e.preventDefault();answer(text);}}><label htmlFor="voice-question">Question or transcript</label><textarea id="voice-question" value={text} onChange={e=>setText(e.target.value)} style={{display:'block',width:'100%'}} rows={3}/><button disabled={!enabled||busy||recording||!text.trim()}>Ask and hear answer</button></form>
  <audio ref={audio} controls style={{width:'100%',marginTop:16}}/>
  {turns.map((t,i)=><article key={i}><strong>{t.question}</strong><p style={{whiteSpace:'pre-wrap'}}>{t.result.reply}</p>{t.result.links.map(url=><p key={url}><a href={url} target="_blank" rel="noreferrer">{linkLabel(url)}</a></p>)}<small>Decision {t.result.decisionId}</small></article>)}
 </main>;
}
