/* 5AHub — Web Push subscriptions, no visible login required. */
(() => {
  const cfg=window.HUB_CONFIG||{}, K='5ahub.notice.desktop.v1';
  const supported=()=>window.isSecureContext && 'Notification' in window && 'PushManager' in window && 'serviceWorker' in navigator;
  const flag=v=>{try{localStorage.setItem(K,JSON.stringify(!!v))}catch{}};
  const bytes=x=>Uint8Array.from(atob(x.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(x.length/4)*4,'=')),c=>c.charCodeAt(0));
  async function registration(){await navigator.serviceWorker.register('./sw.js',{scope:'./'});return navigator.serviceWorker.ready}
  async function activate({db,userId}){
    if(!supported())return {enabled:false,message:'Notifiche push non supportate su questo browser.'};
    if(/iPhone|iPad|iPod/.test(navigator.userAgent)&&!(navigator.standalone||matchMedia('(display-mode: standalone)').matches))
      return {enabled:false,message:'Su iPhone installa prima 5AHub dalla schermata Home.'};
    if(!db||!userId)return {enabled:false,message:'Non è disponibile la sessione anonima per le notifiche.'};
    if(!cfg.vapidPublicKey)return {enabled:false,message:'Il servizio push non è ancora configurato.'};
    const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
    if(permission!=='granted')return {enabled:false,message:'Notifiche non autorizzate nel browser.'};
    const reg=await registration();
    let sub=await reg.pushManager.getSubscription();
    if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes(cfg.vapidPublicKey)});
    const data=sub.toJSON();
    const existing=await db.from('hub_push_subscriptions').select('notify_content,notify_calendar').eq('endpoint',sub.endpoint).maybeSingle();
    if(existing.error)throw Error('Configura prima il database notifiche: '+existing.error.message);
    const pref=existing.data||{notify_content:true,notify_calendar:true};
    const r=await db.from('hub_push_subscriptions').upsert({
      endpoint:sub.endpoint,user_id:userId,p256dh:data.keys.p256dh,auth_secret:data.keys.auth,
      notify_content:pref.notify_content,notify_calendar:pref.notify_calendar,
      updated_at:new Date().toISOString()
    },{onConflict:'endpoint'});
    if(r.error)throw Error('Impossibile registrare questo dispositivo: '+r.error.message);
    flag(true);
    return {enabled:true,message:'Notifiche push attivate, anche con 5AHub chiusa.'};
  }
  async function deactivate({db}){
    const reg=await navigator.serviceWorker.getRegistration('./');
    const sub=await reg?.pushManager?.getSubscription();
    if(sub){
      if(db){const r=await db.from('hub_push_subscriptions').delete().eq('endpoint',sub.endpoint);if(r.error)console.warn(r.error.message);}
      await sub.unsubscribe();
    }
    flag(false);
    return {enabled:false,message:'Notifiche push disattivate su questo dispositivo.'};
  }
  async function toggle(ctx){
    try{
      if(supported()&&Notification.permission==='granted'){
        const reg=await navigator.serviceWorker.getRegistration('./');
        if(await reg?.pushManager?.getSubscription())return await deactivate(ctx);
      }
      return await activate(ctx);
    }catch(e){return {enabled:false,message:'Notifiche non attivate: '+(e?.message||'errore browser')};}
  }
  async function openPreferences({db,userId}){
    if(!supported()||!db||!userId){alert('Le preferenze non sono disponibili in questo momento.');return;}
    const reg=await navigator.serviceWorker.getRegistration('./');
    const sub=await reg?.pushManager?.getSubscription();
    if(!sub){alert('Attiva prima le notifiche dalla campanella.');return;}
    const r=await db.from('hub_push_subscriptions').select('notify_content,notify_calendar').eq('endpoint',sub.endpoint).maybeSingle();
    if(r.error){alert('Errore database: '+r.error.message);return;}
    const p=r.data||{notify_content:true,notify_calendar:true};
    const overlay=document.createElement('div');
    overlay.style.cssText='position:fixed;inset:0;background:#0b2039a8;z-index:99999;display:grid;place-items:center;padding:20px';
    overlay.innerHTML='<form style="width:min(440px,100%);background:white;border-radius:18px;padding:26px;color:#173d58;font:500 15px system-ui"><h2 style="margin:0 0 10px;font-size:22px">Preferenze notifiche</h2><p style="color:#66788b;font-weight:400">Scegli quali avvisi ricevere.</p><label style="display:flex;align-items:center;gap:12px;margin:20px 0"><input type="checkbox" name="content" '+(p.notify_content?'checked':'')+'> Nuovi materiali e comunicazioni</label><label style="display:flex;align-items:center;gap:12px;margin:20px 0"><input type="checkbox" name="calendar" '+(p.notify_calendar?'checked':'')+'> Nuovi eventi Google Calendar</label><div style="display:flex;justify-content:flex-end;gap:9px"><button type="button" data-close>Annulla</button><button type="submit">Salva</button></div></form>';
    document.body.append(overlay);
    overlay.querySelector('[data-close]').onclick=()=>overlay.remove();
    overlay.onclick=e=>{if(e.target===overlay)overlay.remove()};
    overlay.querySelector('form').onsubmit=async e=>{
      e.preventDefault();const f=e.currentTarget;
      const res=await db.from('hub_push_subscriptions').update({
        notify_content:f.elements.content.checked,notify_calendar:f.elements.calendar.checked,updated_at:new Date().toISOString()
      }).eq('endpoint',sub.endpoint);
      if(res.error)alert('Errore: '+res.error.message);else{overlay.remove();alert('Preferenze salvate.');}
    };
  }
  window.HUB_PUSH={supported,toggle,openPreferences};
})();
