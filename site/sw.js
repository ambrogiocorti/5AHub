/* 5AHub — applicazione installabile / supporto offline e push (backend push non attivo) */
const CACHE_NAME='5ahub-shell-v6-20261020';
const SCOPE=new URL(self.registration.scope);
const SHELL=['./','./index.html','./assets/style.css','./assets/app.js','./config.js','./manifest.webmanifest','./assets/icon-192.png','./assets/icon-512.png','./assets/favicon.svg'];
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE_NAME);
  await Promise.allSettled(SHELL.map(async url=>{
   const response=await fetch(new URL(url,SCOPE).href,{cache:'reload'});
   if(response.ok)await cache.put(new URL(url,SCOPE).href,response);
  }));
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith('5ahub-shell-')&&key!==CACHE_NAME).map(key=>caches.delete(key)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin||!url.pathname.startsWith(SCOPE.pathname))return;
 event.respondWith((async()=>{
  try {
   const response=await fetch(request);
   if(response.ok && (request.mode==='navigate'||/\.(?:js|css|svg|png|webmanifest)$/.test(url.pathname))) {
    const cache=await caches.open(CACHE_NAME);await cache.put(request,response.clone());
   }
   return response;
  } catch {
   const cache=await caches.open(CACHE_NAME);
   return await cache.match(request) || (request.mode==='navigate'?await cache.match(new URL('./index.html',SCOPE).href):undefined) || Response.error();
  }
 })());
});
// Preparato per un futuro servizio Web Push. Non invia notifiche da solo.
self.addEventListener('push',event=>{
 let payload={title:'5AHub',body:'C’è una novità nella tua classe.',route:'home'};
 try{payload={...payload,...event.data.json()}}catch{}
 const candidate=new URL('./#/'+encodeURIComponent(String(payload.route||'home')),SCOPE);
 event.waitUntil(self.registration.showNotification(String(payload.title).slice(0,80),{
  body:String(payload.body).slice(0,180),icon:new URL('./assets/icon-192.png',SCOPE).href,
  badge:new URL('./assets/icon-192.png',SCOPE).href,
  tag:String(payload.tag||'5ahub-new-content').slice(0,120),
  data:{url:candidate.href}
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil((async()=>{
  const address=event.notification.data?.url||SCOPE.href;
  const clientsList=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const existing=clientsList.find(client=>client.url.startsWith(SCOPE.href));
  if(existing){await existing.focus(); if('navigate' in existing) await existing.navigate(address);return;}
  if(self.clients.openWindow)await self.clients.openWindow(address);
 })());
});
