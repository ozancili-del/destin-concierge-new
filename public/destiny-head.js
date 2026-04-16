document.addEventListener('DOMContentLoaded',function(){const lS=localStorage;
if(window.location.pathname.toLowerCase().includes('concierge'))return;
const API='https://destin-concierge-new.vercel.app/api/chat';
const POLL='https://destin-concierge-new.vercel.app/api/ozan-poll';
const SAPI='https://destin-concierge-new.vercel.app/api/ozan-send';
let sessionId=sessionStorage.getItem('db_sid')||'wb_'+Math.random().toString(36).substr(2,12);
sessionStorage.setItem('db_sid',sessionId);
let history=JSON.parse(sessionStorage.getItem('db_history')||lS.getItem('db_history')||'[]');
let isOpen=false,isTyping=false,ozanInvited=false,ozanIsActive=false,ozanToken=null,lastSeenTs=0,pollTimer=null;
const style=document.createElement('style');
style.textContent=`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');
#db-bubble{position:fixed;bottom:24px;right:24px;z-index:99999}
#db-btn{width:64px;height:64px;border-radius:50%;background:transparent;border:3px solid #48CAE4;cursor:pointer;box-shadow:0 4px 20px rgba(0,119,182,.45);display:flex;align-items:center;justify-content:center;transition:transform .2s,box-shadow .2s;position:relative;padding:0;overflow:hidden}
#db-btn:hover{transform:scale(1.08);box-shadow:0 6px 28px rgba(0,119,182,.55);border-color:#00B4D8}
#db-btn img,#db-btn svg{transition:opacity .2s}
#db-btn.open .db-icon-open{opacity:0}
#db-btn.open .db-icon-close{opacity:1!important}
#db-btn.open{background:linear-gradient(135deg,#00B4D8,#48CAE4,#90E0EF)}
.db-icon-close{opacity:0!important;position:absolute}
#db-badge{position:absolute;top:-3px;right:-3px;width:18px;height:18px;background:#FF6B6B;border-radius:50%;border:2px solid white;display:none}
#db-window{position:absolute;bottom:74px;right:0;width:360px;height:640px;background:#fff;border-radius:20px;box-shadow:0 12px 48px rgba(0,0,0,.18);display:flex;flex-direction:column;overflow:hidden;transform:scale(.85) translateY(20px);transform-origin:bottom right;opacity:0;pointer-events:none;transition:transform .25s cubic-bezier(.34,1.56,.64,1),opacity .2s ease}
#db-window.open{transform:scale(1) translateY(0);opacity:1;pointer-events:all}
#db-header{background:linear-gradient(135deg,#00B4D8,#48CAE4,#90E0EF);padding:16px 18px;display:flex;align-items:center;gap:12px;flex-shrink:0}
#db-header-text{flex:1}
#db-mobile-close{display:none;background:rgba(255,255,255,.25);border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;flex-shrink:0;align-items:center;justify-content:center;color:white;font-size:18px;line-height:1}
#db-header-name{font-weight:600;font-size:15px;line-height:1.2;background:linear-gradient(90deg,#fff 0%,#ffe066 20%,#ffb3e6 40%,#e0d4ff 55%,#b3f0ff 70%,#ffe066 85%,#fff 100%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:db-rainbow 3s linear infinite}
@keyframes db-rainbow{0%{background-position:0% center}100%{background-position:200% center}}
#db-header-sub{color:rgba(255,255,255,.8);font-size:12px;margin-top:1px}
.db-status-dot{width:8px;height:8px;background:#4ADE80;border-radius:50%;display:inline-block;margin-right:4px}
#db-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;min-height:200px;max-height:440px;scroll-behavior:smooth}
#db-messages::-webkit-scrollbar{width:4px}
#db-messages::-webkit-scrollbar-thumb{background:#e0e0e0;border-radius:2px}
.db-msg{max-width:82%;padding:10px 14px;border-radius:16px;font-size:14px;line-height:1.5;animation:db-pop .2s ease}
@keyframes db-pop{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.db-msg.bot{background:#F0F7FF;color:#1a1a2e;border-bottom-left-radius:4px;align-self:flex-start}
.db-msg.user{background:linear-gradient(135deg,#00B4D8,#48CAE4,#90E0EF);color:white;border-bottom-right-radius:4px;align-self:flex-end}
.db-msg.ozan{background:#e0f2fe;color:#0c4a6e;border-bottom-left-radius:4px;align-self:flex-start;border-left:3px solid #0284c7}
.db-msg.snote{font-size:11px;color:#94a3b8;text-align:center;align-self:center;background:none;padding:2px 0;font-style:italic}
.db-msg a{color:inherit;text-decoration:underline}
.db-typing{display:flex;align-items:center;gap:4px;padding:10px 14px;background:#F0F7FF;border-radius:16px;border-bottom-left-radius:4px;align-self:flex-start;width:52px}
.db-typing span{width:7px;height:7px;background:#48CAE4;border-radius:50%;animation:db-bounce 1.2s infinite}
.db-typing span:nth-child(2){animation-delay:.2s}
.db-typing span:nth-child(3){animation-delay:.4s}
@keyframes db-bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}
#db-input-row{padding:12px 14px;display:flex;gap:8px;border-top:1px solid #f0f0f0;flex-shrink:0;background:white}
#db-input{flex:1;border:1.5px solid #e8e8e8;border-radius:24px;padding:10px 16px;font-size:14px;font-family:'DM Sans',sans-serif;outline:none;transition:border-color .2s;height:42px;line-height:1.4}
#db-input:focus{border-color:#48CAE4}
#db-send{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#00B4D8,#48CAE4,#90E0EF);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform .15s,opacity .15s}
#db-send:hover{transform:scale(1.08)}
#db-send:disabled{opacity:.5;cursor:not-allowed}
#db-footer{text-align:center;padding:6px 0 10px;font-size:11px;color:#bbb;flex-shrink:0}
#db-btn::before{content:'';position:absolute;width:100%;height:100%;border-radius:50%;border:3px solid #48CAE4;animation:db-pulse 2.5s ease-out infinite;pointer-events:none}
#db-btn.open::before{display:none}
@keyframes db-pulse{0%{transform:scale(1);opacity:.8}70%,100%{transform:scale(1.55);opacity:0}}
#db-tooltip{position:absolute;bottom:74px;right:0;background:white;border-radius:16px 16px 4px 16px;padding:10px 14px;font-size:13px;color:#1a1a2e;box-shadow:0 4px 20px rgba(0,0,0,.13);white-space:nowrap;font-weight:500;animation:db-ti .4s cubic-bezier(.34,1.56,.64,1) forwards;cursor:pointer}
#db-tooltip::after{content:'';position:absolute;bottom:-7px;right:18px;width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:7px solid white}
#db-tooltip.hide{animation:db-to .2s ease forwards}
@keyframes db-ti{from{opacity:0;transform:scale(.85) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
@keyframes db-to{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(.85)}}
@media(max-width:480px){#db-bubble{bottom:16px;right:16px}#db-window{position:fixed;bottom:0;right:0;left:0;width:100%;max-height:92vh;border-radius:20px 20px 0 0;transform-origin:bottom center}#db-messages{max-height:calc(92vh - 160px)}#db-mobile-close{display:flex}#db-btn.open{display:none}}
#db-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99998;display:none;align-items:center;justify-content:center}
#db-overlay.show{display:flex}
#db-pop{background:linear-gradient(135deg,#00B4D8,#48CAE4,#90E0EF);border-radius:20px;padding:20px;box-shadow:0 12px 48px rgba(0,180,216,.4);position:relative;display:flex;gap:14px;align-items:flex-start;width:300px;max-width:90vw;animation:dbIn .3s cubic-bezier(.34,1.56,.64,1)}
@keyframes dbIn{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}
#db-pop .dx{position:absolute;top:10px;right:12px;background:rgba(255,255,255,.25);border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;color:white;font-size:13px;display:flex;align-items:center;justify-content:center}
#db-pop img{width:52px;height:52px;border-radius:50%;border:2px solid rgba(255,255,255,.7);flex-shrink:0;object-fit:cover;object-position:top}
#db-pop .ptxt{flex:1;padding-right:18px}
#db-pop .pname{color:white;font-weight:700;font-size:13px;margin:0 0 4px}
#db-pop .pmsg{color:rgba(255,255,255,.92);font-size:12px;margin:0 0 12px;line-height:1.5}
#db-pop .pbtn{background:white;color:#0096c7;border:none;border-radius:20px;padding:8px 18px;font-size:12px;font-weight:700;cursor:pointer}
`;
document.head.appendChild(style);
const wrap=document.createElement('div');
wrap.id='db-bubble';
wrap.innerHTML=`<div id="db-window"><div id="db-header"><img src="https://destin-concierge-new.vercel.app/destiny_avatar.png" alt="Destiny Blue AI Concierge" style="width:52px;height:52px;border-radius:50%;object-fit:cover;object-position:top;flex-shrink:0;"/><div id="db-header-text"><div id="db-header-name">Destiny Blue</div><div id="db-header-sub"><span class="db-status-dot"></span>AI Concierge · Always here</div></div><button id="db-mobile-close" aria-label="Close">✕</button></div><div id="db-messages"></div><div id="db-input-row"><input id="db-input" type="text" placeholder="Ask me anything…" autocomplete="off"/><button id="db-send" aria-label="Send message"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div><div id="db-footer">Powered by Destiny Blue · © Ozan CILI</div></div><div id="db-tooltip">Hi! Ask me anything about Destin!</div><button id="db-btn" aria-label="Chat"><div id="db-badge"></div><img class="db-icon-open" alt="Destiny Blue AI Concierge" src="https://destin-concierge-new.vercel.app/destiny_avatar.png" style="width:60px;height:60px;border-radius:50%;object-fit:cover;object-position:top;display:block;"/><svg class="db-icon-close" width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6L18 18" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg></button>`;
document.body.appendChild(wrap);
const overlay=document.createElement('div');
overlay.id='db-overlay';
overlay.innerHTML=`<div id="db-pop"><button class="dx" id="db-pop-x">✕</button><img src="https://destin-concierge-new.vercel.app/destiny_avatar.png" alt="Destiny Blue AI Concierge"/><div class="ptxt"><p class="pname">Destiny Blue 🌊</p><p class="pmsg">You get <strong style="color:white">10% off</strong> automatically. Chat with me and unlock <strong style="color:white">5% more</strong> on top.</p><button class="pbtn" id="db-pop-go">Treasure Hunt! →</button></div></div>`;
document.body.appendChild(overlay);document.getElementById('db-pop-x').addEventListener('click',dbX);document.getElementById('db-pop-go').addEventListener('click',dbGo);
const btn=document.getElementById('db-btn'),win=document.getElementById('db-window'),msgs=document.getElementById('db-messages'),input=document.getElementById('db-input'),send=document.getElementById('db-send'),tooltip=document.getElementById('db-tooltip');
const TM=["Ask me anything about Destin!","Check availability!","10% off — already applied!","Two beachfront units — compare!","400+ stays, 4.94 rating!","Heated pool open year-round!"];
let tIdx=0,tTimer=null;
function cycleTip(){if(isOpen)return;tooltip.classList.remove('hide');tIdx=(tIdx+1)%TM.length;tooltip.style.animation='none';tooltip.offsetHeight;tooltip.style.animation='';tooltip.textContent=TM[tIdx];tTimer=setTimeout(cycleTip,4000);}
tooltip.addEventListener('click',()=>toggle());
tTimer=setTimeout(cycleTip,4000);
if(window.innerWidth>=1024)setTimeout(()=>{if(!isOpen)toggle();},15000);
function toggle(){isOpen=!isOpen;btn.classList.toggle('open',isOpen);win.classList.toggle('open',isOpen);if(isOpen){tooltip.classList.add('hide');clearTimeout(tTimer);if(msgs.children.length===0){if(history.length>0)history.forEach(m=>{if(m.role==='user')addU(m.content);else addB(m.content);});else{const openers=["Hi! I'm Destiny Blue 🌊 AI concierge for Destin beachfront condos. Live availability, instant booking links. What can I help you with?"];addB(openers[Math.floor(Math.random()*openers.length)]);}}setTimeout(()=>input.focus(),300);}else{setTimeout(()=>{tooltip.classList.remove('hide');tTimer=setTimeout(cycleTip,4000);},500);}}
btn.addEventListener('click',toggle);
document.getElementById('db-mobile-close').addEventListener('click',toggle);
function addB(text){rmTyping();const el=document.createElement('div');el.className='db-msg bot';el.innerHTML=text.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/https?:\/\/[^\s<>"]+/g,u=>`<a href="${u}" target="_blank" style="word-break:break-all;">${u}</a>`);msgs.appendChild(el);msgs.scrollTop=msgs.scrollHeight;}
function addU(text){const el=document.createElement('div');el.className='db-msg user';el.textContent=text;msgs.appendChild(el);msgs.scrollTop=msgs.scrollHeight;}
function addOzan(text){rmTyping();const w=document.createElement('div');w.style.cssText='display:flex;flex-direction:column;align-self:flex-start;max-width:82%';const l=document.createElement('div');l.style.cssText='font-size:10px;font-weight:600;color:#0284c7;margin-bottom:3px';l.textContent='Ozan';const el=document.createElement('div');el.className='db-msg ozan';el.textContent=text;w.appendChild(l);w.appendChild(el);msgs.appendChild(w);msgs.scrollTop=msgs.scrollHeight;}
function addNote(text){const el=document.createElement('div');el.className='db-msg snote';el.textContent=text;msgs.appendChild(el);msgs.scrollTop=msgs.scrollHeight;}
function showTyping(){rmTyping();const el=document.createElement('div');el.className='db-typing';el.id='db-typing';el.innerHTML='<span></span><span></span><span></span>';msgs.appendChild(el);msgs.scrollTop=msgs.scrollHeight;}
function rmTyping(){const t=document.getElementById('db-typing');if(t)t.remove();}
function startPoll(){if(pollTimer)return;pollTimer=setInterval(async()=>{try{const r=await fetch(`${POLL}?s=${sessionId}&since=${lastSeenTs}&_t=${Date.now()}`);if(!r.ok)return;const d=await r.json();if(d.ozanActive==='TRUE'&&!ozanIsActive){ozanIsActive=true;ozanInvited=false;addNote('🟢 Ozan has joined the chat');}if(d.ozanActive==='FALSE'&&ozanIsActive){ozanIsActive=false;clearInterval(pollTimer);pollTimer=null;addNote('Ozan has left — Destiny Blue is back! 😊');}const nm=(d.messages||[]).filter(m=>m.ts>lastSeenTs&&m.role==='ozan');if(nm.length){nm.forEach(m=>addOzan(m.text));lastSeenTs=Math.max(...nm.map(m=>m.ts));}}catch(e){}},3000);}
async function sendMsg(){const text=input.value.trim();if(!text||isTyping)return;input.value='';lS.setItem('dbx','1');if(text!=='__popup_open__')addU(text);
if(ozanIsActive||ozanInvited){try{await fetch(SAPI,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId,text,t:ozanToken||'pending',role:'guest'})});}catch(e){}return;}
if(text!=='__popup_open__')history.push({role:'user',content:text});sessionStorage.setItem('db_history',JSON.stringify(history));lS.setItem('db_history',JSON.stringify(history));isTyping=true;send.disabled=true;showTyping();
try{const res=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:history.slice(-20),sessionId,pageSource:sessionStorage.getItem('db_source')||null,sawBanner:sessionStorage.getItem('db_saw_banner')||null})});const data=await res.json();const reply=data.reply||data.message||"I'm having a little trouble right now — please try again!";
if(data.ozanInvited){ozanInvited=true;if(data.ozanToken)ozanToken=data.ozanToken;startPoll();}
if(!reply){isTyping=false;send.disabled=false;return;}
history.push({role:'assistant',content:reply});sessionStorage.setItem('db_history',JSON.stringify(history));lS.setItem('db_history',JSON.stringify(history));addB(reply);}catch{addB("Sorry, I couldn't connect. Please try again or reach Ozan at (972) 357-4262.");}
isTyping=false;send.disabled=false;input.focus();}
send.addEventListener('click',sendMsg);
input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg();}});
function dbX(){document.getElementById('db-overlay').classList.remove('show');lS.setItem('dbx','1');}
function dbGo(){sessionStorage.setItem('db_source','popup');lS.setItem('dbx','1');sessionStorage.removeItem('db_history');history=[];dbX();if(!isOpen)btn.click();setTimeout(function(){isTyping=false;send.disabled=false;if(msgs)msgs.innerHTML='';var i=document.getElementById('db-input');if(i){i.value='__popup_open__';sendMsg();}},500);}
setTimeout(function(){if(lS.getItem('dbx'))return;sessionStorage.setItem('db_saw_banner','1');lS.setItem('db_saw_banner','1');document.getElementById('db-overlay').classList.add('show');},3000);
});

// Mobile fix — move purple banner above booking widget
if (window.innerWidth < 992) {
  window.addEventListener('load', function() {
    var banner = document.getElementById('discount-banner');
    var widgetCol = document.querySelector('.col-md-4.pull-right-md');
    if (banner && widgetCol) {
      widgetCol.parentNode.insertBefore(banner, widgetCol);
    }
  });
}
