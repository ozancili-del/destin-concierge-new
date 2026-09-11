import {useEffect,useState} from 'react';
export default function PrivatePreviewBudget(){
 const [budget,setBudget]=useState(null);
 useEffect(()=>{let active=true;const update=()=>fetch('/api/destiny-private-budget').then(r=>r.json()).then(b=>{if(active)setBudget(b);}).catch(()=>{});update();const timer=setInterval(update,5000);return()=>{active=false;clearInterval(timer);};},[]);
 return <p role="status">{budget?.capUsd?<>Shared Chat/Voice limit: <strong>${budget.capUsd.toFixed(2)}</strong> · accounted ${budget.accountedUsd.toFixed(4)} · remaining ${budget.remainingUsd.toFixed(4)}{budget.halted?` · STOPPED: ${budget.halted}`:''}</>:'Loading private usage limit…'}</p>;
}
