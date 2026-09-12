import Head from 'next/head';
import {useEffect,useRef,useState} from 'react';
import {isPrivatePeer} from '../lib/destiny-brain/boundary.js';
import PrivatePreviewBudget from '../components/PrivatePreviewBudget';
import {getOrderedBrowserClient} from '../lib/destiny-brain/ordered-client.js';
export async function getServerSideProps({req,res}){
  const hosted=process.env.VERCEL_ENV==='preview';
  if(!hosted&&!isPrivatePeer(req))return {notFound:true};
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
  const orderedMemoryEnabled=process.env.DESTINY_ORDERED_MEMORY==='1';
  return {props:{hosted,orderedMemoryEnabled,modelCallsEnabled:!!process.env.OPENAI_API_KEY&&((hosted&&!orderedMemoryEnabled)||process.env.DESTINY_PRIVATE_MODEL_CALLS==='1')}};
}
const SESSION_KEY='destiny_private_preview_session_v1';
function linkLabel(url){if(/unit-707/i.test(url))return 'View Unit 707';if(/unit-1006/i.test(url))return 'View Unit 1006';if(/tripshock/i.test(url))return 'Browse activities';if(/discovercars/i.test(url))return 'Compare rental cars';if(/aviasales/i.test(url))return 'View flight options';return 'Open recommended page';}
export default function PrivateChat({modelCallsEnabled=false,hosted=false,orderedMemoryEnabled=false}){
  const [text,setText]=useState(''),[turns,setTurns]=useState([]),[busy,setBusy]=useState(false);
  const version=useRef(undefined),pending=useRef(null),sessionToken=useRef(null);
  useEffect(()=>{if(hosted)sessionToken.current=sessionStorage.getItem(SESSION_KEY);},[hosted]);
  useEffect(()=>{
    if(!orderedMemoryEnabled)return;let active=true,unsubscribe;
    getOrderedBrowserClient().then(client=>{if(active)unsubscribe=client.subscribe(s=>{
      if(s.expired){setTurns([]);setText('');pending.current=null;return;}
      setTurns(previous=>{const rows=new Map(previous.filter(t=>t.result).map(t=>[t.result.sequence,t]));for(const result of s.answers)rows.set(result.sequence,{question:result.question,result});return [...rows.values()].sort((a,b)=>a.result.sequence-b.result.sequence);});
    });}).catch(error=>{if(active)setTurns([{error:error.message}]);});
    return()=>{active=false;unsubscribe?.();};
  },[orderedMemoryEnabled]);
  async function send(event){
    event.preventDefault();if(busy||!text.trim())return;
    if(orderedMemoryEnabled){
      const question=text;setBusy(true);
      const turnId=pending.current?.text===question?pending.current.turnId:crypto.randomUUID();pending.current={text:question,turnId};
      try{const client=await getOrderedBrowserClient();await client.enqueue(question,turnId,'chat');pending.current=null;setText('');}
      catch(error){setTurns(t=>[...t,{error:error.message}]);}finally{setBusy(false);}return;
    }
    const request=pending.current?.text===text?pending.current:{text,turnId:crypto.randomUUID(),version:version.current,pageContext:{source:'private-chat',url:'/'},...(hosted&&sessionToken.current?{sessionToken:sessionToken.current}:{})};
    pending.current=request;setBusy(true);
    try{
      let response=await fetch('/api/destiny-private-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request)});
      let result=await response.json();
      if(response.status===409&&result.error==='session_version_conflict'&&Number.isInteger(result.version)){
        request.version=result.version;version.current=result.version;
        response=await fetch('/api/destiny-private-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request)});result=await response.json();
      }
      if(!response.ok)throw new Error(result.error||'Request failed');
      version.current=result.version;if(hosted&&result.sessionToken){sessionToken.current=result.sessionToken;sessionStorage.setItem(SESSION_KEY,result.sessionToken);}pending.current=null;setTurns(t=>[...t,{question:text,result}]);setText('');
    }catch(error){setTurns(t=>[...t,{error:error.message}]);}finally{setBusy(false);}
  }
  return <main style={{maxWidth:760,margin:'40px auto',padding:24,fontFamily:'system-ui',lineHeight:1.6}}>
    <Head><title>Destiny private candidate</title><meta name="robots" content="noindex,nofollow"/></Head>
    <h1>Destiny private candidate</h1><p>{hosted?'Protected web review session':'Local review session'}. Not approved for release. <a href="/voice-lab">Continue this conversation in Voice Lab</a> · <a href="https://docs.google.com/spreadsheets/d/1XQMOW4F-02K5POSJ679R-uAOpZ9SqoeT1lVF4ccbfUs/edit#gid=1986509024" target="_blank" rel="noreferrer">Open review log</a></p>
    {modelCallsEnabled&&(hosted?<p role="status">Hosted synthetic review · production remains unchanged</p>:<PrivatePreviewBudget/>)}
    <p>Chat and Voice share this browser’s conversation. {orderedMemoryEnabled?'Synthetic text, state and audit events expire after 24 hours; the external review log is disabled.':'Successful private turns are recorded in the review log.'} Voice requires a separate microphone and playback review; a matching decision ID does not certify the audio.</p>
    <p>Owner contact, message delivery, maintenance alerts, leads and reservation access are unavailable in this preview. Approved booking and activity links remain available. Use synthetic questions only.</p>
    {!modelCallsEnabled&&<p role="status">Model responses are disabled for this nonbillable preview. Interactive use needs a separately approved usage budget.</p>}
    {turns.map((t,i)=><article key={i} style={{borderBottom:'1px solid #bbb',padding:'16px 0'}}>{t.error?<p role="alert">{t.error}. Your question is kept for retry.</p>:<><strong>{t.question}</strong><p style={{whiteSpace:'pre-wrap'}}>{t.result.reply}</p>{t.result.links.map(url=><p key={url}><a href={url} target="_blank" rel="noreferrer">{linkLabel(url)}</a></p>)}<details><summary>Review trace</summary><pre style={{overflow:'auto',fontSize:12}}>{JSON.stringify({...t.result,sessionToken:t.result.sessionToken?'[protected]':undefined},null,2)}</pre></details></>}</article>)}
    <form onSubmit={send}><label htmlFor="question">Your question</label><textarea id="question" value={text} onChange={e=>setText(e.target.value)} rows={3} style={{display:'block',width:'100%',font:'inherit'}}/><button disabled={!modelCallsEnabled||busy||!text.trim()}>{busy?'Working…':'Send'}</button></form>
  </main>;
}
