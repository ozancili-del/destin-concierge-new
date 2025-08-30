// pages/api/chat.js

// --- Config (env overrides allowed) ---
const BOOK_URL = process.env.OWNERREZ_BOOK_URL || "https://www.destincondogetaways.com/book";
// IMPORTANT: Set this in Vercel (ORP12345 or just 12345 both work)
const PROPERTY_ID = process.env.OWNERREZ_PROPERTY_ID || "ORPXXXXXX";

// --- Date/guest parsing (supports 2025-10-10, 10/10/25, Oct 10 2025) ---
function normalizeYear(yy){ if(!yy) return null; if(yy.length===4) return yy; const n=+yy; return (n<70?"20":"19")+yy; }
const MONTHS={jan:"01",january:"01",feb:"02",february:"02",mar:"03",march:"03",apr:"04",april:"04",may:"05",jun:"06",june:"06",jul:"07",july:"07",aug:"08",august:"08",sep:"09",sept:"09",september:"09",oct:"10",october:"10",nov:"11",november:"11",dec:"12",december:"12"};

function collectDates(text=""){
  const t=String(text); const hits=[];
  for(const m of t.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)){ const[,y,mo,d]=m; hits.push({iso:`${y}-${mo}-${d}`,i:m.index}); }
  for(const m of t.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g)){ let[,mm,dd,yy]=m; yy=normalizeYear(yy); hits.push({iso:`${yy}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}`,i:m.index}); }
  for(const m of t.matchAll(/\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s*(\d{2,4})\b/g)){ let[,mn,dd,yy]=m; const mo=MONTHS[mn.toLowerCase()]; if(mo){ yy=normalizeYear(yy); hits.push({iso:`${yy}-${mo}-${String(dd).padStart(2,"0")}`,i:m.index}); } }
  hits.sort((a,b)=>a.i-b.i); return hits.map(h=>h.iso);
}

function extract(text=""){
  const dates=collectDates(text);
  let adults, children;
  const mA=text.match(/(\d+)\s*adult(s)?/i); if(mA) adults=parseInt(mA[1],10);
  const mC=text.match(/(\d+)\s*(child|children|kid|kids)/i); if(mC) children=parseInt(mC[1],10);
  const mG=text.match(/(\d+)\s*guest(s)?/i); if(mG && adults===undefined && children===undefined){ adults=parseInt(mG[1],10); children=0; }
  if(adults===undefined) adults=2; if(children===undefined) children=0;
  if(dates.length>=2) return { start:dates[0], end:dates[1], adults, children };
  return null;
}

function buildOwnerRezLink({start,end,adults,children}){
  const base=(BOOK_URL||"").replace(/\/$/,"");
  const qs=new URLSearchParams({
    or_arrival: start,          // YYYY-MM-DD (required by OwnerRez)
    or_departure: end,
    or_adults: String(adults),
    or_children: String(children),
    or_propertyId: PROPERTY_ID  // ORP12345 or 12345
  });
  return `${base}?${qs.toString()}`;
}

// --- Simple FAQ (no AI) ---
function norm(s=""){ return s.toLowerCase().replace(/[\s\-_]/g,""); }
function faqReply(t=""){
  const n=norm(t);
  if(n.includes("wifi")) return "Yes—fast Wi-Fi is included. Details are in your arrival email.";
  if(n.includes("parking")) return "Free on-site parking (one spot per unit).";
  if(n.includes("checkin")) return "Check-in is 4pm. Early check-in may be possible—tell me your dates.";
  if(n.includes("checkout")) return "Check-out is 11am. Late check-out subject to availability.";
  if(n.includes("pets")) return "Small, well-behaved pets with approval and a cleaning fee.";
  if(n.includes("book")||n.includes("availability")) return "Tell me your unit, dates and guests, and I’ll create a booking link.";
  return null;
}

// --- API handler ---
export default async function handler(req,res){
  if(req.method==="GET") return res.status(200).json({ok:true, bookUrl:BOOK_URL, propertyId:PROPERTY_ID});
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});

  try{
    const {messages=[]}=req.body||{};
    const lastUser=[...messages].reverse().find(m=>m.role==="user")?.content||"";

    const parsed = extract(lastUser);
    if(parsed){
      const link = buildOwnerRezLink(parsed);
      const guestLine = `${parsed.adults} adult${parsed.adults>1?"s":""}` + (parsed.children?` + ${parsed.children} child${parsed.children>1?"ren":""}`:"");
      const reply =
        `Great — Pelican beach resort unit 1006 for **${guestLine}**, ` +
        `check-in **${parsed.start}**, check-out **${parsed.end}**.\n\n` +
        `Here’s your booking link:\n${link}\n\n` +
        `You can adjust details on the booking page.`;
      return res.status(200).json({reply});
    }

    const faq=faqReply(lastUser);
    if(faq) return res.status(200).json({reply:faq});

    return res.status(200).json({reply:"Please share **unit** (e.g., Unit 1006), **check-in / check-out** dates, and **guests** (e.g., 2 adults 1 child). I’ll send your booking link."});
  }catch(err){
    console.error("Chat error:",err);
    return res.status(200).json({reply:"I hit a temporary error. Please resend your unit, dates, and guests."});
  }
}
