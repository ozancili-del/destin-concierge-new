// Nonbillable validation preload. No remote sockets, HTTP or fetch requests.
const net=require('node:net'),http=require('node:http'),https=require('node:https');
const local=h=>['localhost','127.0.0.1','::1','[::1]'].includes(h);
const deny=()=>{throw Error('OFFLINE_VALIDATION_NETWORK_BLOCKED');};
const connect=net.Socket.prototype.connect;
net.Socket.prototype.connect=function(...args){const a=args[0];const host=typeof a==='object'?a.host:typeof args[1]==='string'?args[1]:'localhost';if(!a?.path&&!local(host||'localhost'))deny();return connect.apply(this,args);};
for(const mod of [http,https])for(const method of ['request','get']){const original=mod[method];mod[method]=function(url,...args){const h=typeof url==='string'||url instanceof URL?new URL(url).hostname:url.hostname||url.host||'localhost';if(!local(h))deny();return original.call(this,url,...args);};}
const originalFetch=globalThis.fetch;globalThis.fetch=(url,options)=>{const target=typeof url==='object'&&url.url?url.url:String(url);if(!local(new URL(target).hostname))return Promise.reject(Error('OFFLINE_VALIDATION_NETWORK_BLOCKED'));return originalFetch(url,options);};
