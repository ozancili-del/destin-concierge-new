import Head from 'next/head';
import {useRef,useState} from 'react';
export async function getServerSideProps({req,res}){
  if(process.env.DESTINY_PRIVATE_RUNTIME!=='1'||process.env.VERCEL_ENV||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))return {notFound:true};
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
  return {props:{}};
}
export default function PrivateChat(){
  const [text,setText]=useState(''),[turns,setTurns]=useState([]),[busy,setBusy]=useState(false);
  const version=useRef(undefined),pending=useRef(null);
  async function send(event){
    event.preventDefault();if(busy||!text.trim())return;
    const request=pending.current?.text===text?pending.current:{text,turnId:crypto.randomUUID(),version:version.current,pageContext:{source:'private-chat',url:'/'}};
    pending.current=request;setBusy(true);
    try{
      const response=await fetch('/api/destiny-private-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request)});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'Request failed');
      version.current=result.version;pending.current=null;setTurns(t=>[...t,{question:text,result}]);setText('');
    }catch(error){setTurns(t=>[...t,{error:error.message}]);}finally{setBusy(false);}
  }
  return <main style={{maxWidth:760,margin:'40px auto',padding:24,fontFamily:'system-ui',lineHeight:1.6}}>
    <Head><title>Destiny private candidate</title><meta name="robots" content="noindex,nofollow"/></Head>
    <h1>Destiny private candidate</h1><p>Local review session. <a href="/voice-lab">Open Voice Lab</a></p>
    {turns.map((t,i)=><article key={i} style={{borderBottom:'1px solid #bbb',padding:'16px 0'}}>{t.error?<p role="alert">{t.error}. Your question is kept for retry.</p>:<><strong>{t.question}</strong><p style={{whiteSpace:'pre-wrap'}}>{t.result.reply}</p>{t.result.links.map(url=><p key={url}><a href={url} target="_blank" rel="noreferrer">{url}</a></p>)}<details><summary>Review trace</summary><pre style={{overflow:'auto',fontSize:12}}>{JSON.stringify(t.result,null,2)}</pre></details></>}</article>)}
    <form onSubmit={send}><label htmlFor="question">Your question</label><textarea id="question" value={text} onChange={e=>setText(e.target.value)} rows={3} style={{display:'block',width:'100%',font:'inherit'}}/><button disabled={busy||!text.trim()}>{busy?'Working…':'Send'}</button></form>
  </main>;
}
