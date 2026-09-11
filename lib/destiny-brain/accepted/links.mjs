import {requireContract} from './kernel.mjs';

// One parser/normalizer for publication and output. Never canonicalize a path,
// query or fragment: case, duplicate parameters, order and encoding are material.
export function decodeMarkup(value) {
  return value.replace(/&#(x[0-9a-f]+|\d+);?/gi,(_,n)=>String.fromCodePoint(parseInt(n.replace(/^x/i,''),/^x/i.test(n)?16:10)))
    .replace(/&(amp|quot|apos|lt|gt|colon|Tab|NewLine);/g,(_,n)=>({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',colon:':',Tab:'\t',NewLine:'\n'}[n]));
}
export function canonicalUrl(raw,{markup=false}={}) {
  requireContract(typeof raw==='string'&&raw.length>0&&raw.length<=8192,'malformed_public_url');
  let value=markup?decodeMarkup(raw).replace(/\\([()])/g,'$1'):raw;
  if(/^www\./i.test(value))value='https://'+value;
  requireContract(!/[\u0000-\u0020\u007f-\u009f\\<>"`]/u.test(value)&&!/%(?![0-9a-f]{2})/i.test(value),'malformed_public_url');
  requireContract(!/%(?:00|0a|0d|5c)/i.test(value),'unsafe_public_url');
  requireContract(!/^(?:javascript|data|file|vbscript|blob|ftp):/i.test(value),'unsafe_public_url');
  if(/^mailto:/i.test(value)) {
    requireContract(/^mailto:[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(value)&&!/[?#]/.test(value),'malformed_public_contact');
    const [local,host]=value.slice(7).split('@');return 'mailto:'+local+'@'+host.toLowerCase();
  }
  if(/^tel:/i.test(value)){requireContract(/^tel:\+?[0-9()-]{5,25}$/.test(value),'malformed_public_contact');return value;}
  const m=/^https:\/\/([^/?#]+)([^]*)$/i.exec(value);
  requireContract(m,'unsafe_public_url');
  requireContract(!m[1].includes('@'),'credential_url');
  let u;try{u=new URL(value);}catch{requireContract(false,'malformed_public_url');}
  const host=u.hostname.toLowerCase();
  requireContract(host.includes('.')&&!host.endsWith('.')&&!host.endsWith('.localhost')&&!host.endsWith('.local')&&!host.endsWith('.internal')&&!host.includes(':')&&!/^[\d.]+$/.test(host),'unauthorized_destination');
  requireContract(/^[a-z0-9.-]+$/.test(host)&&host.split('.').every(s=>s&&s.length<=63&&!s.startsWith('-')&&!s.endsWith('-')),'malformed_public_url');
  requireContract(!u.port||u.port==='443','unauthorized_destination');
  const suffix=m[2]||'/';
  // WHATWG URL would collapse dot segments. Reject rather than widen authority.
  requireContract(!/(?:^|\/)(?:\.|%2e){1,2}(?:\/|$)/i.test(suffix.split(/[?#]/)[0]),'unsafe_public_url');
  requireContract(!/[?&](?:token|api_key|password|secret|access_token|authorization)=/i.test(value),'credential_url');
  return 'https://'+host+(suffix.startsWith('/')?suffix:'/'+suffix);
}
const trimBare=value=>{
  let s=value.replace(/[.,;!?:'’”]+$/,'');
  for(const [close,open] of [[')', '('],[']','['],['}','{']])while(s.endsWith(close)&&s.split(close).length>s.split(open).length)s=s.slice(0,-1);
  return s;
};
export function urlOccurrences(text,{knownUrls=[]}={}) {
  requireContract(typeof text==='string','invalid_public_text');
  const spans=[];
  const add=(start,end,target,kind,label)=>{if(!spans.some(s=>start<s.end&&end>s.start))spans.push({start,end,target,kind,label});};
  // Explicit targets retain URL punctuation; only bare prose trims delimiters.
  for(const m of text.matchAll(/<a\b([^>]*)>([^]*?)<\/a\s*>/gi)){
    const attrs=m[1],h=/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
    requireContract(h&&(attrs.match(/\bhref\s*=/gi)||[]).length===1&&!/\bon\w+\s*=|\b(?:src|style)\s*=/i.test(attrs)&&!/[<>]/.test(m[2]),'unsafe_public_markup');
    add(m.index,m.index+m[0].length,h[1]??h[2]??h[3],'html',m[2].replace(/<[^>]*>/g,''));
  }
  for(const m of text.matchAll(/!?\[([^\]\r\n]*)\]\(/g)){
    if(spans.some(s=>m.index>=s.start&&m.index<s.end))continue;
    let at=m.index+m[0].length,depth=1,end=at;
    for(;end<text.length;end++){if(text[end]==='\\'){end++;continue;}if(text[end]==='(')depth++;if(text[end]===')'&&!--depth)break;}
    requireContract(depth===0,'malformed_public_markup');
    const inside=text.slice(at,end).trim(),target=/^<([^<>]+)>(?:\s+"[^"]*")?$/.exec(inside)?.[1]??inside.replace(/\s+"[^"]*"$/,'');
    requireContract(!m[0].startsWith('!'),'unsafe_public_markup');
    add(m.index,end+1,target,'markdown',m[1]);
  }
  for(const m of text.matchAll(/^\s{0,3}\[([^\]]+)\]:\s*(<[^>]+>|\S+)(?:\s+"[^"]*")?\s*$/gm))add(m.index,m.index+m[0].length,m[2].replace(/^<|>$/g,''),'reference',m[1]);
  for(const m of text.matchAll(/<((?:[a-z][a-z\d+.-]*:|\/\/)[^<>\s]+)>/gi))add(m.index,m.index+m[0].length,m[1],'autolink',null);
  for(const m of text.matchAll(/(?:https?:|www\.|mailto:|tel:|javascript:|vbscript:|data:|file:|blob:|ftp:)[^\s<>"`]+/gi)){
    let exact=false;try{exact=knownUrls.includes(canonicalUrl(m[0]));}catch{}
    const target=exact?m[0]:trimBare(m[0]);add(m.index,m.index+target.length,target,'bare',null);
  }
  // Unsupported active markup is rejected, never allowed to hide a destination.
  spans.sort((a,b)=>a.start-b.start);
  const outside=spans.reduceRight((s,r)=>s.slice(0,r.start)+' '.repeat(r.end-r.start)+s.slice(r.end),text);
  requireContract(!/<\/?(?:script|iframe|object|embed|img|svg|form|input|link|meta|a)\b|\b(?:href|src)\s*=/i.test(outside),'unsafe_public_markup');
  return spans.sort((a,b)=>a.start-b.start);
}

export function filterOutputLinks(text,links,depth=0) {
  requireContract(depth<8,'unsafe_public_markup');
  const allowed=new Map(links.map(l=>[canonicalUrl(l.url),l])),warnings=[],spans=urlOccurrences(text,{knownUrls:[...allowed.keys()]});
  let safe=text;
  for(const s of [...spans].reverse()) {
    const label=s.label?filterOutputLinks(s.label,links,depth+1):null;
    if(label?.warnings.length)warnings.unshift(...label.warnings);
    let key;try{key=canonicalUrl(s.target,{markup:s.kind!=='bare'});}catch(e){
      // An unsafe scheme, private destination or credential remains a hard block.
      if(['unsafe_public_url','unsafe_public_markup','unauthorized_destination','credential_url'].includes(e.code))throw e;
    }
    if(key&&allowed.has(key)){
      if(label?.warnings.length)safe=safe.slice(0,s.start)+`[${label.text}](${key})`+safe.slice(s.end);
      continue;
    }
    warnings.unshift({code:'untrusted_output_link_withheld',target:s.target,kind:s.kind,offset:s.start});
    // Link labels are explanatory prose; keep them while removing clickability.
    const replacement=s.kind==='reference'?'':s.label?`${label.text} (link unavailable)`:'(link unavailable)';
    safe=safe.slice(0,s.start)+replacement+safe.slice(s.end);
  }
  return {text:safe,warnings};
}
