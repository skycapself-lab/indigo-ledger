const C='ledger-v3';const CORE=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','badge-96.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);
 if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put('index.html',cp));return r}).catch(()=>caches.match('index.html')));return}
 e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{if(r.ok&&(u.origin===location.origin||/fonts\.(googleapis|gstatic)\.com/.test(u.host))){const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp))}return r})))});
/* reminders & status bar */
const pad=n=>String(n).padStart(2,'0');const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
function db(){return new Promise((res,rej)=>{const r=indexedDB.open('indigo-ledger-sw',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function kv(k,v){const d=await db();return new Promise((res,rej)=>{const t=d.transaction('kv',v===undefined?'readonly':'readwrite');const s=t.objectStore('kv');const q=v===undefined?s.get(k):s.put(v,k);t.oncomplete=()=>res(q.result);t.onerror=()=>rej(t.error)})}
const OPT={icon:'icon-192.png',badge:'badge-96.png'};
async function check(){const st=await kv('state');if(!st)return;const now=new Date(),day=ymd(now),hm=pad(now.getHours())+':'+pad(now.getMinutes());const R=st.reminder||{};
 if(R.on&&hm>=R.time&&(await kv('reminded'))!==day){await kv('reminded',day);
  const skip=R.mode==='opened'?st.lastOpen===day:R.mode==='recorded'?(st.lastEntryDay===day||st.txDay===day):false;
  if(!skip)await self.registration.showNotification('記帳時間到了',{...OPT,tag:'ledger-remind',body:'今天的花費記了嗎？點這裡記一筆。',data:{url:'./#add'},actions:[{action:'add',title:'記一筆'}]})}
 if(st.status&&st.status.on&&st.day!==day){const lines=(st.lines||[]).map(l=>l.startsWith('今日支出')?'今日支出 $0':l);
  await self.registration.showNotification('靛夜記帳本',{...OPT,tag:'ledger-status',body:lines.join('　·　')||'點此記一筆',silent:true,renotify:false,requireInteraction:true,data:{url:'./'},actions:[{action:'add',title:'記一筆'}]});
  st.day=day;st.lines=lines;await kv('state',st)}}
self.addEventListener('periodicsync',e=>{if(e.tag==='ledger-check')e.waitUntil(check())});
self.addEventListener('notificationclick',e=>{const add=e.action==='add'||(e.notification.data&&e.notification.data.url||'').includes('#add');e.notification.close();
 const url=new URL(add?'./#add':'./',self.registration.scope).href;
 e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{for(const c of cs){if('focus' in c){if(add)c.postMessage({type:'add'});return c.focus()}}return clients.openWindow(url)}))});
