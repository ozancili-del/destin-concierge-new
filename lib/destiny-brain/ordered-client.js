// Audio cancellation never owns ingestion. Storage retries reuse the exact ID.
export class OrderedConversationClient{
  constructor({request,bootstrapId,clientId,wait=ms=>new Promise(r=>setTimeout(r,ms)),onAnswer=()=>{},onExpire=()=>{}}){
    Object.assign(this,{request,bootstrapId,clientId,wait,onAnswer,onExpire});
    this.sequence=0;this.after=0;this.rows=new Map();this.acceptLane=Promise.resolve();this.pumping=false;this.wake=0;this.ready=null;this.stopped=null;this.listeners=new Set();this.expiryTimer=null;
  }
  init(){return this.ready??=this.request({op:'bootstrap',bootstrapId:this.bootstrapId}).then(status=>{
    if(Number.isFinite(status.expiresAt)){this.expiryTimer=setTimeout(()=>this.expire(),Math.max(0,status.expiresAt-Date.now()));this.expiryTimer.unref?.();}return status;
  });}
  expire(){clearTimeout(this.expiryTimer);this.stopped=Error('conversation_expired');for(const r of this.rows.values())if(!r.done)r.reject(this.stopped);this.rows.clear();this.onExpire();for(const fn of this.listeners)fn({expired:true,answers:[]});}
  subscribe(fn){
    this.listeners.add(fn);const refresh=async()=>{try{await this.init();const s=await this.request({op:'status',after:0});if(this.listeners.has(fn))fn(s);}catch(e){if(e.message==='conversation_expired')this.expire();}};
    void refresh();const timer=setInterval(refresh,10000);timer.unref?.();return()=>{clearInterval(timer);this.listeners.delete(fn);};
  }
  enqueue(text,turnId,channel,{onAccepted=()=>{}}={}){
    const prior=this.rows.get(turnId);
    if(prior){if(prior.text!==text||prior.channel!==channel)throw Error('turn_id_collision');return prior.promise;}
    if(this.rows.size>=256)return Promise.reject(Error('memory_capacity'));
    let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
    const row={text,turnId,channel,promise,resolve,reject};this.rows.set(turnId,row);
    this.acceptLane=this.acceptLane.then(async()=>{
      if(this.stopped)throw this.stopped;
      await this.init();const body={op:'accept',text,turnId,clientId:this.clientId,clientSequence:this.sequence+1,synthetic:true};
      let accepted;
      for(let n=0;n<3;n++){
        try{accepted=await this.request(body,channel);break;}
        catch(e){if(n===2||e.status&&e.status<500)throw e;await this.wait(150*(n+1));}
      }
      if(!accepted)throw Error('input_not_acknowledged');
      this.sequence++;row.accepted=true;onAccepted(accepted);void this.pump();
    }).catch(e=>{
      // An ambiguous ACK cannot permit a later sequence to overtake this input.
      this.stopped=e;row.reject(e);
    });
    return promise;
  }
  async pump(){
    this.wake++;
    if(this.pumping||this.stopped)return;this.pumping=true;
    try{
      await this.init();
      while(true){
        const generation=this.wake,status=await this.request({op:'status',after:this.after});
        for(const answer of status.answers){
          this.after=Math.max(this.after,answer.sequence);this.onAnswer(answer);
          for(const fn of this.listeners)fn({answers:[answer]});
          const row=this.rows.get(answer.turnId);if(row){row.done=true;row.resolve(answer);}
        }
        if(status.blocked)throw Error('Conversation paused: '+status.blocked);
        if(!status.pending){if(generation!==this.wake)continue;break;}
        const result=await this.request({op:'process'});
        if(result.blocked)throw Error('Conversation paused: '+result.blocked);
        if(result.busy)await this.wait(500);
      }
    }catch(e){this.stopped=e;for(const p of this.rows.values())if(!p.done)p.reject(e);}
    finally{this.pumping=false;}
  }
}

// Provider commits are in capture order; transcription may finish out of order.
// Empty items advance the barrier. Failed/missing items stop it.
export class TranscriptOrderBuffer{
  constructor(deliver){this.deliver=deliver;this.order=[];this.rows=new Map();this.stopped=false;}
  register(id){if(!id)throw Error('capture_id_required');if(this.rows.has(id))return false;if(this.rows.size>=256)throw Error('capture_capacity');this.rows.set(id,{done:false});this.order.push(id);return true;}
  complete(id,event){
    if(this.stopped)throw Error('transcript_order_unproven');
    const row=this.rows.get(id);if(!row)throw Error('transcript_without_capture');
    if(row.done)return false;row.done=true;row.event=event;
    while(this.order.length&&this.rows.get(this.order[0]).done){const next=this.rows.get(this.order.shift());this.deliver(next.event);}
    return true;
  }
  fail(){this.stopped=true;}
}

let browserClient;
export async function getOrderedBrowserClient(){
  if(browserClient)return browserClient;
  if(!navigator.locks)throw Error('This preview requires browser Web Locks for shared-session initialization.');
  return navigator.locks.request('destiny-ordered-preview-bootstrap',async()=>{
    if(browserClient)return browserClient;
    const key='destiny_ordered_preview_seed_v1';let seed=localStorage.getItem(key);
    if(!/^[a-f0-9]{64}$/.test(seed||'')){seed=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');localStorage.setItem(key,seed);}
    const request=async(body,channel='chat')=>{
      const r=await fetch('/api/destiny-private-'+channel,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const result=await r.json();if(!r.ok){const e=Error(result.error||'Private memory request failed');e.status=r.status;throw e;}return result;
    };
    const client=new OrderedConversationClient({request,bootstrapId:seed,clientId:crypto.randomUUID(),onExpire:()=>localStorage.removeItem(key)});await client.init();browserClient=client;return client;
  });
}
