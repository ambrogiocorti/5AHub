/* 5AHub | Portale della classe. Nessuna chiave segreta lato client. */
(() => {
'use strict';
const config=window.HUB_CONFIG||{};
const LIVE=/^https:\/\/[a-z0-9.-]+\.supabase\.co$/i.test(config.supabaseUrl||'') && Boolean(config.supabasePublishableKey);
const db=(LIVE&&window.supabase?.createClient)?window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey):null;
const CLASS=config.className||'5A';
const root=document.querySelector('#app');
const demoPosts=[
 {id:'demo-1',kind:'announcement',title:'Benvenuti in 5AHub',body:'Il portale della nostra classe: informazioni e materiali in un unico posto.',created_at:'2026-10-20T12:00:00Z'},
 {id:'demo-2',kind:'opportunity',title:'Open day e incontri di orientamento',body:'Uno spazio dedicato alle opportunità dopo il diploma.',created_at:'2026-10-20T12:00:00Z'},
 {id:'demo-5',kind:'assembly',title:'La voce della classe',body:'Portiamo idee, problemi e iniziative alle assemblee.',created_at:'2026-10-20T12:00:00Z'}
];
const state={route:'home',menu:false,modal:null,filter:'Tutte',search:'',posts:LIVE?[]:demoPosts,materials:[],user:null,authError:'',loading:!!db,loadError:'',saving:false,notificationPanel:false,notifications:[],notifyOptIn:false,installGuide:false};
const nav=[
 ['home','home','Panoramica'],['calendario','calendar','Calendario'],['maturita','graduation','Maturità'],['orientamento','compass','Orientamento'],
 ['assemblee','users','Assemblee'],['segnala','message','Segnala']
];
const paths={
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z"/><path d="M9 21v-7h6v7"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
 graduation:'<path d="m2 10 10-5 10 5-10 5-10-5ZM6 12v5c3 3 9 3 12 0v-5M22 10v7"/>',
 compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2.7 5.3L8 16l2.7-5.3L16 8Z"/>',
 sparkles:'<path d="m12 3 1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8L12 3ZM19 18l.8 2.2L22 21l-2.2.8L19 24l-.8-2.2L16 21l2.2-.8L19 18Z"/>',
 users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3.2a4 4 0 0 1 0 7.6M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
 message:'<path d="M21 11.5a8.4 8.4 0 0 1-8.4 8.4 9 9 0 0 1-4-.9L3 21l2-5.6A8.4 8.4 0 1 1 21 11.5Z"/>',
 shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
 arrow:'<path d="M5 12h14m-7-7 7 7-7 7"/>',chevron:'<path d="m9 18 6-6-6-6"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
 file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
 link:'<path d="M10 13a5 5 0 0 0 7 .2l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7-.2l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
 external:'<path d="M13 5h6v6M19 5l-9 9"/><path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"/>',
 copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
 edit:'<path d="M15 5l4 4M4 20l4.8-.8L20 8a2.8 2.8 0 0 0-4-4L4.8 15.2 4 20Z"/>',
 trash:'<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',
 close:'<path d="M18 6 6 18M6 6l12 12"/>',menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
 info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/>',
 check:'<path d="m4 12 5 5L20 6"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 login:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
 logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
 download:'<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>',
 upload:'<path d="M12 16V4m-4 4 4-4 4 4M3 16v4h18v-4"/>',
 refresh:'<path d="M20 11a8 8 0 0 0-14-5L3 9M3 4v5h5M4 13a8 8 0 0 0 14 5l3-3M21 20v-5h-5"/>',
 inbox:'<path d="M4 4h16l2 12v4H2v-4L4 4ZM2 15h6l2 3h4l2-3h6"/>',
 alert:'<path d="M12 3 2 21h20L12 3ZM12 9v5M12 18h.01"/>',
 mail:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 6 10 7L22 6"/>',
 bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
 install:'<path d="M12 3v12m-4-4 4 4 4-4M5 18v3h14v-3"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.9 1.9-.1-.1a1.7 1.7 0 0 0-1.9-.3l-1.1.5V21h-2.7v-2.1l-1.1-.5a1.7 1.7 0 0 0-1.9.3l-.1.1-1.9-1.9.1-.1A1.7 1.7 0 0 0 7.5 15L7 14H5v-4h2l.5-1a1.7 1.7 0 0 0-.3-1.9l-.1-.1L9 5.1l.1.1A1.7 1.7 0 0 0 11 5.5l1-.5V3h3v2l1 .5a1.7 1.7 0 0 0 1.9-.3l.1-.1L20 7l-.1.1A1.7 1.7 0 0 0 19.5 9l.5 1h2v4h-2l-.6 1Z"/>'
};
const icon=(name,size=19)=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.info}</svg>`;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=url=>{try{const u=new URL(String(url));return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}};
const newDate=value=>value?new Date(value.length===10?value+'T12:00:00':value):null;
const dateIt=value=>{const d=newDate(value);return d&&!Number.isNaN(+d)?d.toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'}):''};
const dayName=()=>new Date().toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long'});
const routeFromHash=()=>{const r=location.hash.replace(/^#\/?/,'');return nav.some(n=>n[0]===r)?r:'home'};
const hasEdit=()=>Boolean(state.user&&db);
const canEdit=item=>Boolean(hasEdit()&&item?.author_id===state.user.id);
const publicStorageUrl=path=>path&&db?db.storage.from('hub-materials').getPublicUrl(path).data.publicUrl:'';
const titleFor=r=>(nav.find(n=>n[0]===r)||nav[0])[2];
const getPosts=kind=>state.posts.filter(p=>p.kind===kind).sort((a,b)=>(b.created_at||'').localeCompare(a.created_at||''));
function toast(message){const node=document.querySelector('#toast');node.innerHTML=`<div>${esc(message)}</div>`;clearTimeout(toast.timer);toast.timer=setTimeout(()=>node.innerHTML='',4000)}
function button(text,action='new-post',kind='',cls='primary'){return `<button class="button ${cls}" data-action="${action}" ${kind?`data-kind="${esc(kind)}"`:''}>${action==='new-post'||action==='new-material'?icon('plus',15):''}${esc(text)}</button>`}
function empty(text,detail='I contenuti pubblicati dalla classe compariranno qui.') {return `<div class="empty">${icon('inbox',27)}<h4>${esc(text)}</h4><p>${esc(detail)}</p></div>`}
function bannerPreview(){return !db?`<div class="notice warn" style="margin-bottom:22px">${icon('info')}<div><strong>Anteprima del portale.</strong> I contenuti contrassegnati come esempio sono dimostrativi. Per pubblicare aggiornamenti e file condivisi è necessario collegare il backend seguendo la guida del progetto.</div></div>`:''}
function pageHead(kicker,title,subtitle,ctas=''){return `<div class="page-head"><div><span class="eyebrow">${esc(kicker)}</span><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div>${ctas?`<div class="page-ctas">${ctas}</div>`:''}</div>`}
function adminTag(item){return String(item.id).startsWith('demo-')?'<span class="badge-example">ESEMPIO</span>':''}
function shortcut(to,ico,t,sub){return `<button class="shortcut" data-route="${to}"><span class="mini-icon ${ico==='sparkles'?'teal':''}">${icon(ico)}</span><span><strong>${esc(t)}</strong><small>${esc(sub)}</small></span>${icon('chevron',17)}</button>`}
// Le notifiche locali rilevano nuovi contenuti quando la pagina e' aperta.
// Il push a sito chiuso richiede un servizio di invio server-side e non e' ancora attivo.
const ALERT_CACHE='5ahub.notice.items.v1';
const LAST_CHECK='5ahub.notice.lastcheck.v1';
const NOTIFY_PREF='5ahub.notice.desktop.v1';
let deferredInstallPrompt=null;
function readStored(key,fallback){try{const value=localStorage.getItem(key);return value===null?fallback:JSON.parse(value)}catch{return fallback}}
function writeStored(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
state.notifications=readStored(ALERT_CACHE,[]).slice(0,25);
state.notifyOptIn=readStored(NOTIFY_PREF,false);
const noticeRoute={announcement:'home',opportunity:'orientamento',assembly:'assemblee'};
function hasAppInstalled(){return window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true}
function unreadCount(){return state.notifications.filter(n=>!n.read).length}
function noticeCenter(){if(!state.notificationPanel)return '';
 return `<div class="notice-popover" role="region" aria-label="Centro notifiche"><div class="notice-popover-head"><strong>Aggiornamenti</strong><button class="button muted small" data-action="read-notifications">Segna come letti</button></div>
 <p class="notice-subtitle">Nuovi contenuti condivisi su 5AHub.</p>
 <div class="notice-popover-list">${state.notifications.length?state.notifications.slice(0,15).map(n=>`<button class="notice-entry ${!n.read?'new':''}" data-action="open-notice" data-id="${esc(n.id)}"><span class="notice-entry-mark"></span><span><strong>${esc(n.title)}</strong><small>${esc(n.detail)}</small></span>${icon('chevron',15)}</button>`).join(''):empty('Nessun nuovo contenuto','Quando qualcuno pubblica una novità, la troverai qui.')}</div>
 <div class="notice-popover-bottom">${'Notification' in window && 'serviceWorker' in navigator?
 `<button class="button secondary small" data-action="enable-device-notices">${icon('bell',14)} ${state.notifyOptIn?'Disattiva notifiche push':'Attiva notifiche push'}</button><button class="button muted small" data-action="push-preferences">Preferenze</button>`:
 `<small>Il tuo browser non supporta gli avvisi del dispositivo.</small>`}
 <small>Dopo la configurazione del servizio push, gli avvisi arriveranno anche con l’app chiusa.</small></div></div>`}
async function deviceNotice(item){
 if(!state.notifyOptIn||!('Notification' in window)||Notification.permission!=='granted'||document.visibilityState==='visible')return;
 try{if(window.HUB_PUSH && state.notifyOptIn)return;
  const registration=await navigator.serviceWorker?.ready;
  if(registration?.showNotification)await registration.showNotification('5AHub · '+item.detail,{body:item.title,icon:'assets/icon-192.png',tag:item.id,data:{url:new URL('./#/'+item.route,location.href).href}});
 }catch(err){console.warn('Notifica dispositivo non disponibile',err)}
}
function processRecentContent(posts,mats){
 const checked=readStored(LAST_CHECK,null), now=Date.now();
 const sources=[...posts.map(p=>({id:'post:'+p.id,title:p.title,detail:p.kind==='announcement'?'Nuova comunicazione':p.kind==='opportunity'?'Nuovo orientamento':'Nuovo argomento assemblea',route:noticeRoute[p.kind]||'home',created_at:p.created_at,author_id:p.author_id})),...mats.map(m=>({id:'material:'+m.id,title:m.title,detail:'Nuovo materiale per la maturità',route:'maturita',created_at:m.created_at,author_id:m.author_id}))];
 if(typeof checked==='number'&&checked>0){
  const incoming=sources.filter(item=>{
   const when=Date.parse(item.created_at||'');
   return Number.isFinite(when)&&when>checked&&when<now+60000&&item.author_id!==state.user?.id&&!state.notifications.some(n=>n.id===item.id);
  });
  if(incoming.length){
   const fresh=incoming.slice(0,12).map(x=>({id:x.id,title:x.title,detail:x.detail,route:x.route,read:false}));
   state.notifications=[...fresh,...state.notifications].slice(0,25);
   writeStored(ALERT_CACHE,state.notifications);
   if(document.visibilityState==='visible')toast(incoming.length===1?'Nuovo contenuto: '+incoming[0].title:`${incoming.length} nuovi contenuti pubblicati`);
   deviceNotice(fresh[0]);
  }
 }
 writeStored(LAST_CHECK,now);
}
async function handleDeviceNotices(){
 const service=window.HUB_PUSH;
 if(!service){toast('Servizio notifiche non ancora pronto');return;}
 const result=await service.toggle({db,userId:state.user?.id});
 state.notifyOptIn=Boolean(result.enabled);
 writeStored(NOTIFY_PREF,state.notifyOptIn);
 toast(result.message);
 render();
}
function installGuide(){const isApple=/iPhone|iPad|iPod/.test(navigator.userAgent);return `<div class="modal-overlay" data-action="outside"><div class="modal install-modal" role="dialog" aria-modal="true" aria-labelledby="install-title"><div class="modal-head"><h2 id="install-title">Installa 5AHub</h2><button class="button muted icon" data-action="close-install" aria-label="Chiudi">${icon('close')}</button></div><div class="install-body"><div class="install-mark">5A</div><h3>La tua classe, come un'app.</h3><p>Apri 5AHub dalla schermata Home, senza cercare il link nel browser.</p>${isApple?`<ol><li>Apri questo sito su Safari.</li><li>Tocca <strong>Condividi</strong>.</li><li>Seleziona <strong>Aggiungi alla schermata Home</strong>, quindi conferma.</li></ol>`:`<ol><li>Apri il menu del browser.</li><li>Seleziona <strong>Installa app</strong> oppure <strong>Aggiungi a schermata Home</strong>.</li><li>Conferma l'installazione.</li></ol>`}<p class="install-caveat">Calendario e contenuti condivisi richiedono una connessione internet.</p></div><div class="actions-end"><button class="button primary" data-action="close-install">Ho capito</button></div></div></div>`}

function shell(){const route=state.route;const sections=[nav.slice(0,4),nav.slice(4)];return `<div class="shell"><div class="mobile-shade ${state.menu?'show':''}" data-action="close-menu"></div><aside class="sidebar ${state.menu?'open':''}"><div class="brand"><div class="brand-symbol">5A</div><div><div class="brand-name">5A<span>Hub</span></div><div class="brand-sub">IL PORTALE DELLA CLASSE</div></div></div>${sections.map((group,i)=>`<div class="nav-section"><div class="nav-caption">${['IL TUO SPAZIO','PARTECIPAZIONE'][i]}</div>${group.map(([r,ic,t])=>`<button class="nav-button ${route===r?'current':''}" data-route="${r}" ${route===r?'aria-current="page"':''}>${icon(ic,19)}${esc(t)}</button>`).join('')}</div>`).join('')}<div class="sidebar-bottom"><div class="sidebar-footer">5AHub · Anno scolastico ${esc(config.academicYear||'2026/27')}</div></div></aside><main class="main"><header class="topbar"><div style="display:flex;gap:12px;align-items:center"><button class="hamburger" data-action="open-menu" aria-label="Apri menu">${icon('menu',22)}</button><div><div class="bread">5AHub / ${esc(CLASS)} · ${esc(config.academicYear||'2026/27')}</div><div class="topbar-title">${esc(titleFor(route))}</div></div></div><div class="top-right"><span class="top-date">${esc(dayName())}</span><span class="dot-divider"></span><div class="topbar-tools">${!hasAppInstalled()?`<button class="top-tool install-tool" data-action="install-pwa" title="Installa 5AHub">${icon('install',17)}<span>Installa</span></button>`:''}<div class="notifications-anchor"><button class="top-tool notification-tool" data-action="toggle-notifications" aria-label="Aggiornamenti" title="Aggiornamenti">${icon('bell',19)}${unreadCount()?`<span class="notice-count">${unreadCount()>9?'9+':unreadCount()}</span>`:''}</button>${noticeCenter()}</div></div><span class="top-avatar">5A</span></div></header><div class="content">${bannerPreview()}${state.authError?`<div class="notice warn" role="alert" style="margin-bottom:22px">${icon('alert')}<div><strong>Pubblicazione momentaneamente non disponibile.</strong> ${esc(state.authError)}. I contenuti restano consultabili.</div></div>`:''}${state.loadError?`<div class="notice warn" role="alert" style="margin-bottom:22px">${icon('alert')}<div><strong>Collegamento non riuscito.</strong> I contenuti non sono stati sincronizzati: ${esc(state.loadError)}. Riprova più tardi o contatta i rappresentanti.</div></div>`:''}${renderPage()}<footer class="footer"><span>© ${new Date().getFullYear()} 5AHub · Il portale della nostra classe</span><span>${db?'Contenuti condivisi · Contributi aperti a tutti':'Anteprima non collegata al database'}</span></footer></div></main></div>${state.modal?modal():''}${state.installGuide?installGuide():''}`}
function renderPage(){if(state.loading)return `<div class="loader-line"><span class="spinner"></span> Sincronizzazione in corso…</div>`;return `${({home,calendario,maturita,orientamento,assemblee,segnala})[state.route]()} `}
function home(){const news=getPosts('announcement').slice(0,3);return `
<div class="hero"><div class="hero-inner"><span class="eyebrow">BENVENUTI NELLO SPAZIO DELLA 5A</span><h1>La nostra quinta.<br> Tutto in un posto.</h1><p>Un unico punto di riferimento per gli impegni scolastici, i materiali della maturità e i progetti che rendono speciale il nostro ultimo anno.</p><div class="hero-actions"><button class="button white" data-route="calendario">${icon('calendar',16)} Vai al calendario</button><button class="button ghost" data-route="maturita">${icon('graduation',16)} Materiali maturità</button></div></div></div>
<div class="section-heading"><div><h2>Tutto quello che ti serve</h2><p>Le sezioni principali, senza perdere tempo nelle chat.</p></div></div>
<div class="grid three">${shortcut('calendario','calendar','Calendario condiviso','Verifiche, compiti e scadenze')}${shortcut('maturita','graduation','Materiali maturità','File e risorse per materia')}${shortcut('segnala','message','La tua voce','Segnalazioni e suggerimenti')}</div>
<div class="section-heading"><div><h2>In evidenza</h2><p>Novità e iniziative pubblicate dalla classe.</p></div>${hasEdit()?button('Nuova comunicazione','new-post','announcement','secondary'):''}</div>
<div class="grid two"><div class="card"><div class="card-header"><div><h2>Comunicazioni</h2><p>Novità pubblicate dai compagni.</p></div><span class="pill blue">${news.length} aggiornamenti</span></div>${news.length?news.map(post=>`<div class="announcement"><span class="mini-icon teal">${icon('info')}</span><div><h4>${esc(post.title)}${adminTag(post)}</h4><p>${esc(post.body)}</p><div class="meta">${dateIt(post.created_at)}</div></div></div>`).join(''):empty('Ancora nessuna comunicazione','Qui troverai le comunicazioni pubblicate dalla classe.')}</div><div class="right-rail"><div class="callout"><div class="eyebrow" style="margin-bottom:7px">PARTECIPA</div><h3 style="font-size:16px;margin-bottom:7px">La classe è anche tua.</h3><p style="font-size:12px;color:#56728b;margin-bottom:13px">Idee e problemi meritano di essere ascoltati.</p><button class="button secondary small" data-route="segnala">Invia una segnalazione ${icon('arrow',14)}</button></div></div></div>`}
function calendario(){const embed=safe(config.googleCalendarEmbed);return `${pageHead('ORGANIZZAZIONE','Calendario della classe','Verifiche, compiti, interrogazioni e scadenze in un unico calendario.',`<a class="button secondary" href="${esc(embed)}" target="_blank" rel="noopener noreferrer">${icon('external')} Apri su Google Calendar</a>`)}<div class="card calendar-card"><div class="cal-shell"><iframe title="Calendario Google della classe 5A" src="${esc(embed)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div></div>`}
function materialActions(m){const fileUrl=safe(publicStorageUrl(m.file_path)),url=safe(m.external_url);return `<div class="material-action">${fileUrl?`<a class="button secondary small" href="${esc(fileUrl)}" target="_blank" rel="noopener noreferrer">${icon('download',14)} Apri file</a>`:''}${url?`<a class="button secondary small" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${icon('external',14)} Apri link</a>`:''}${canEdit(m)?`<button class="button muted icon" data-action="edit-material" data-id="${esc(m.id)}" aria-label="Modifica">${icon('edit',15)}</button><button class="button danger icon" data-action="delete-material" data-id="${esc(m.id)}" aria-label="Elimina">${icon('trash',15)}</button>`:''}</div>`}

function maturita(){const subjects=['Tutte',...new Set(state.materials.map(m=>m.subject))];const q=state.search.toLowerCase().trim();const list=state.materials.filter(m=>(state.filter==='Tutte'||m.subject===state.filter)&&[m.title,m.subject,m.description,m.file_name].join(' ').toLowerCase().includes(q));return `${pageHead('ESAME DI STATO','Materiali per la maturità','Appunti, simulazioni, esercizi e risorse condivise, divisi per materia.',hasEdit()?button('Carica un materiale','new-material'):'' )}
<div class="filterbar"><div class="search">${icon('search')}<input id="material-search" type="search" placeholder="Cerca un titolo o una materia…" aria-label="Cerca materiali" value="${esc(state.search)}"></div><span class="pill">${state.materials.length} materiali condivisi</span></div><div class="filterchips" style="margin-bottom:19px">${subjects.map(x=>`<button class="chip ${state.filter===x?'active':''}" data-action="set-filter" data-filter="${esc(x)}">${esc(x)}</button>`).join('')}</div><div id="material-results" class="materials">${list.length?list.map(m=>`<div class="material-row"><span class="mini-icon">${icon(m.file_path?'file':'link',19)}</span><div class="material-body"><h3 class="material-title">${esc(m.title)}</h3>${m.description?`<p>${esc(m.description)}</p>`:''}<div class="meta">${esc(m.subject)}${m.file_name?' · '+esc(m.file_name):''}${m.file_size?' · '+(m.file_size/1048576).toFixed(1)+' MB':''} · ${dateIt(m.created_at)}</div></div>${materialActions(m)}</div>`).join(''):empty(state.materials.length?'Nessun risultato':'Non sono stati ancora caricati materiali',state.materials.length?'Prova a cambiare ricerca o filtro.':'PDF, presentazioni, documenti e altri file compariranno qui non appena saranno caricati.')}</div>`}
function postCard(p){const url=safe(p.external_url);return `<article class="post-card"><div class="post-card-top"><span class="pill ${p.kind==='opportunity'?'green':'blue'}">${p.kind==='opportunity'?'Opportunità':p.kind==='assembly'?'Assemblea':'Comunicazione'}</span>${p.event_date?`<span class="meta">${dateIt(p.event_date)}</span>`:''}</div><h3>${esc(p.title)}${adminTag(p)}</h3><p>${esc(p.body)}</p><div class="post-card-foot"><span class="meta">${dateIt(p.created_at)}</span><div class="post-card-actions">${url?`<a class="button secondary small" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Apri ${icon('external',13)}</a>`:''}${canEdit(p)?`<button class="button muted icon" data-action="edit-post" data-id="${esc(p.id)}" aria-label="Modifica contenuto">${icon('edit',14)}</button><button class="button danger icon" data-action="delete-post" data-id="${esc(p.id)}" aria-label="Elimina contenuto">${icon('trash',14)}</button>`:''}</div></div></article>`}
function postsSection(kind,label,title,subtitle,iconName){const ps=getPosts(kind);return `${pageHead(label,title,subtitle,hasEdit()?button('Aggiungi contenuto','new-post',kind):'')}<div class="cards-list">${ps.length?ps.map(postCard).join(''):empty('Ancora nessun contenuto','Quando saranno pubblicate nuove informazioni le vedrai qui.')}</div>`}
function orientamento(){return postsSection('opportunity','IL FUTURO DOPO IL DIPLOMA','Orientamento','Webinar, open day, università, formazione e opportunità da non perdere.','compass')}
function assemblee(){const posts=getPosts('assembly');return `${pageHead('PARTECIPAZIONE','Assemblee di classe','Argomenti, proposte e decisioni da discutere insieme, dando spazio a tutti.',hasEdit()?button('Nuovo argomento','new-post','assembly'):'')}<div class="grid two"><div><div class="cards-list" style="grid-template-columns:1fr">${posts.length?posts.map(postCard).join(''):empty('Non ci sono argomenti pubblicati')}</div></div><div class="right-rail"><div class="card"><div class="card-header"><div><h2>Hai qualcosa da proporre?</h2><p>Un problema, una richiesta oppure un'idea per la classe.</p></div><span class="mini-icon teal">${icon('message')}</span></div><p style="font-size:12px;color:var(--slate)">Usa il modulo dedicato. Le segnalazioni saranno raccolte per poter affrontare gli argomenti più importanti in assemblea.</p><button class="button secondary" data-route="segnala">Vai a Segnala ${icon('arrow',15)}</button></div></div></div>`}
function segnala(){const embed=safe(config.googleFormEmbed||'');return `${pageHead('LA VOCE DELLA CLASSE','Segnala un problema o proponi un’idea','Compila il modulo qui sotto per condividere suggerimenti, richieste e proposte.')}
<div class="card report-card"><div class="card-header"><div><h2>Modulo di segnalazione</h2><p>Scrivi la tua proposta direttamente da questa pagina.</p></div><span class="pill blue">Google Forms</span></div>${/^https:\/\/docs\.google\.com\/forms\//i.test(embed)?`<iframe class="formframe" title="Modulo Google per segnalazioni della classe" src="${esc(embed)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin">Il browser non supporta i moduli incorporati.</iframe>`:empty('Modulo non configurato','Il collegamento al modulo deve essere impostato dal gestore del sito.')}</div>`}
function modal(){let item=state.modal?.id?(state.modal.type==='material'?state.materials:state.posts).find(x=>x.id===state.modal.id):null;const type=state.modal.type;
 const isMat=type==='material',kind=item?.kind||state.modal?.kind||'announcement',tit=item?`Modifica ${isMat?'materiale':'contenuto'}`:isMat?'Carica un materiale':'Nuovo contenuto';
 return `<div class="modal-overlay" data-action="outside"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><h2 id="modal-title">${tit}</h2><button class="button muted icon" data-action="close-modal" aria-label="Chiudi">${icon('close')}</button></div><form id="content-form" data-type="${type}"><div class="form-grid">
 <div class="field ${isMat?'':'wide'}"><label for="title">Titolo *</label><input id="title" name="title" maxlength="160" required value="${esc(item?.title||'')}" placeholder="Titolo chiaro e sintetico"></div>
 ${isMat?`<div class="field"><label for="subject">Materia *</label><select id="subject" name="subject">${['Italiano','Storia','Matematica','Informatica','Sistemi e Reti','TPSI','Inglese','Telecomunicazioni','Altro'].map(s=>`<option ${s===(item?.subject||'Italiano')?'selected':''}>${s}</option>`).join('')}</select></div>`:`<div class="field"><label for="event-date">Data (facoltativa)</label><input type="date" id="event-date" name="event_date" value="${esc(item?.event_date||'')}"></div>`}
 <div class="field wide"><label for="description">${isMat?'Descrizione':'Testo'}</label><textarea id="description" name="description" maxlength="${isMat?1000:3000}" placeholder="Aggiungi informazioni utili…">${esc(isMat?item?.description:item?.body)}</textarea></div>
 <div class="field wide"><label for="external-url">Link esterno (facoltativo)</label><input id="external-url" name="external_url" type="url" maxlength="1000" placeholder="https://…" value="${esc(item?.external_url||'')}"></div>
 ${isMat?`<div class="field wide"><label for="attachment">Carica un file (PDF, Word, PowerPoint, Excel, immagini o TXT)</label><div class="input-file"><input id="attachment" name="attachment" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"><span class="help">Massimo 15 MB · I file caricati saranno pubblici.</span></div>${item?.file_name?`<div class="help">File attuale: ${esc(item.file_name)}. Selezionane un altro per sostituirlo.</div>`:''}</div>`:''}
 </div><div class="actions-end"><button type="button" class="button muted" data-action="close-modal">Annulla</button><button type="submit" class="button" ${state.saving?'disabled':''}>${icon('check')} ${state.saving?'Salvataggio…':'Salva e pubblica'}</button></div></form></div></div>`}
function render(){state.route=routeFromHash();root.innerHTML=shell();document.title=titleFor(state.route)+' · 5AHub'}
async function refreshData({quiet=false}={}){if(!db)return;try{const [posts,mats]=await Promise.all([db.from('hub_posts').select('*').in('kind',['announcement','opportunity','assembly']).order('created_at',{ascending:false}),db.from('hub_materials').select('*').order('created_at',{ascending:false})]);for(const r of [posts,mats])if(r.error)throw r.error;processRecentContent(posts.data||[],mats.data||[]);state.posts=posts.data||[];state.materials=mats.data||[];state.loadError='';if(!quiet)toast('Dati aggiornati')}catch(e){state.loadError=e.message;toast('Impossibile sincronizzare i contenuti: '+e.message)}finally{state.loading=false;if(!state.modal)render()}}
function describeAuthError(err){
 const code=String(err?.code||'').toLowerCase(),detail=String(err?.message||'');
 if(/anonymous.*(disabled|not enabled|not allowed)|anonymous_provider_disabled|anonymous_signups_disabled/i.test(detail+' '+code))
   return 'Le sessioni anonime non risultano abilitate per questo progetto: controlla “Allow anonymous sign-ins” e salva le modifiche.';
 if(/signup|registration|signups_not_allowed|signup_disabled/i.test(detail+' '+code))
   return 'Supabase non consente la creazione di nuove sessioni: abilita anche “Allow new users to sign up” nelle impostazioni Auth.';
 if(/captcha|bot verification/i.test(detail+' '+code))
   return 'La verifica CAPTCHA è obbligatoria nel backend ma non ancora configurata sul sito: serve integrare CAPTCHA in 5AHub.';
 if(/rate.?limit|too many requests|over_request_rate_limit/i.test(detail+' '+code))
   return 'Troppe richieste di sessione: riprova più tardi e verifica i limiti anti-abuso del progetto.';
 if(/invalid.*(api|key)|apikey/i.test(detail+' '+code))
   return 'Controlla la chiave pubblicabile del progetto in config.js: Supabase non l’ha accettata.';
 if(/fetch|network|failed to fetch/i.test(detail+' '+code))
   return 'Impossibile collegarsi al servizio di autenticazione; controlla la connessione o eventuali blocchi del browser.';
 return 'Non è stato possibile creare la sessione anonima ('+(detail.slice(0,160)||code||'errore sconosciuto')+'). Controlla le impostazioni Auth e la console del browser.';
}
async function ensureAnonymousSession(){if(!db)return;
 try{const {data:sessionData,error:sessionError}=await db.auth.getSession();if(sessionError)throw sessionError;
 let session=sessionData?.session;
 if(!session){const r=await db.auth.signInAnonymously();if(r.error)throw r.error;session=r.data?.session}
 if(!session?.user)throw Error('Impossibile creare la sessione anonima');
 state.user=session.user;state.authError='';
 }catch(err){state.user=null;state.authError=describeAuthError(err);console.warn('Sessione anonima non disponibile:',err?.code||'',err?.message||err)}
}
const extToMime={pdf:'application/pdf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',txt:'text/plain'};
function getAttachment(form){const file=form.querySelector('#attachment')?.files?.[0];if(!file)return null;const ext=file.name.split('.').pop().toLowerCase();if(!extToMime[ext])throw Error('Formato non consentito. Usa PDF, Word, PowerPoint, Excel, PNG, JPG o TXT.');if(file.size>15728640)throw Error('Il file supera 15 MB.');return {file,ext,mime:extToMime[ext]}}
async function saveContent(form){if(!hasEdit())return toast('La pubblicazione anonima non è ancora disponibile');const mat=state.modal?.type==='material',id=state.modal?.id;const existing=id?(mat?state.materials:state.posts).find(x=>x.id===id):null;
 if(existing&&!canEdit(existing))throw Error('Puoi modificare soltanto i tuoi contenuti.');
 const f=new FormData(form), title=String(f.get('title')||'').trim(),text=String(f.get('description')||'').trim(),url=String(f.get('external_url')||'').trim();if(!title)throw Error('Inserisci il titolo.');if(url&&!safe(url))throw Error('Il link deve iniziare per http:// o https://.');
 let payload,uploadPath=null,oldPath=existing?.file_path||null;
 if(mat){const attachment=getAttachment(form);if(!attachment&&!existing?.file_path&&!url)throw Error('Carica un file oppure inserisci un link.');payload={title,subject:String(f.get('subject')),description:text,external_url:url||null,file_path:oldPath,file_name:existing?.file_name||null,file_size:existing?.file_size||null};if(attachment){uploadPath=state.user.id+'/'+crypto.randomUUID()+'.'+attachment.ext;const {error}=await db.storage.from('hub-materials').upload(uploadPath,attachment.file,{upsert:false,contentType:attachment.mime});if(error)throw error;payload.file_path=uploadPath;payload.file_name=attachment.file.name.slice(0,220);payload.file_size=attachment.file.size}}
 else {const kind=existing?.kind||state.modal?.kind; if(!['announcement','opportunity','assembly'].includes(kind))throw Error('Sezione non valida'); payload={title,kind,body:text,event_date:String(f.get('event_date')||'')||null,external_url:url||null};}
 let result;try{const table=mat?'hub_materials':'hub_posts';result=existing?await db.from(table).update(payload).eq('id',id).select('id').single():await db.from(table).insert(payload).select('id').single();if(result.error)throw result.error}catch(e){if(uploadPath)await db.storage.from('hub-materials').remove([uploadPath]).catch(()=>{});throw e}
 if(mat&&uploadPath&&oldPath&&oldPath!==uploadPath){const {error}=await db.storage.from('hub-materials').remove([oldPath]);if(error)toast('Pubblicato. Il vecchio file potrebbe richiedere pulizia manuale.')}
 state.modal=null;await refreshData({quiet:true});toast(existing?'Modifiche pubblicate':'Contenuto pubblicato per tutti')}
async function deleteEntry(type,id){if(!hasEdit())return toast('La pubblicazione anonima non è ancora disponibile');const mat=type==='material';const row=(mat?state.materials:state.posts).find(p=>p.id===id);if(!row||!canEdit(row))throw Error('Puoi eliminare soltanto i tuoi contenuti.');if(!confirm(`Eliminare definitivamente “${row.title}”?`))return;const table=mat?'hub_materials':'hub_posts';const {error}=await db.from(table).delete().eq('id',id);if(error)throw error;if(mat&&row.file_path){const r=await db.storage.from('hub-materials').remove([row.file_path]);if(r.error)toast('Elemento rimosso, verifica il file nello Storage.')}await refreshData({quiet:true});toast('Contenuto eliminato')}
async function clipboard(text){try{await navigator.clipboard.writeText(text);toast('Messaggio copiato')}catch{const input=document.createElement('textarea');input.value=text;document.body.appendChild(input);input.select();const done=document.execCommand('copy');input.remove();toast(done?'Messaggio copiato':'Impossibile copiare automaticamente')}}
root.addEventListener('click',async e=>{const control=e.target.closest('[data-action],[data-route]');if(!control)return;const route=control.dataset.route;if(route){state.menu=false;state.modal=null;location.hash='#/'+route;if(state.route===route)render();window.scrollTo({top:0,behavior:'instant'});return}const action=control.dataset.action;const id=control.dataset.id;
 try{if(action==='install-pwa'){
  if(deferredInstallPrompt){deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;render();}
  else{state.installGuide=true;render()}return;
 }
 if(action==='close-install'){state.installGuide=false;render();return}
 if(action==='toggle-notifications'){state.notificationPanel=!state.notificationPanel;render();return}
 if(action==='read-notifications'){state.notifications=state.notifications.map(n=>({...n,read:true}));writeStored(ALERT_CACHE,state.notifications);render();return}
 if(action==='open-notice'){const item=state.notifications.find(n=>n.id===id);if(item){item.read=true;writeStored(ALERT_CACHE,state.notifications);state.notificationPanel=false;location.hash='#/'+item.route;render()}return}
 if(action==='enable-device-notices'){await handleDeviceNotices();return}
 if(action==='push-preferences'){await window.HUB_PUSH?.openPreferences({db,userId:state.user?.id});return}
 if(action==='outside'){if(e.target===control){state.modal=null;state.installGuide=false;render()}return}if(action==='open-menu'){state.menu=true;render();return}if(action==='close-menu'){state.menu=false;render();return}if(action==='close-modal'){state.modal=null;render();return}
 if(action==='set-filter'){state.filter=control.dataset.filter;render();return}
 if(action==='new-material'){state.modal={type:'material'};render();return}if(action==='edit-material'){state.modal={type:'material',id};render();return}
 if(action==='new-post'){const kind=({home:'announcement',orientamento:'opportunity',assemblee:'assembly'})[state.route]; if(!kind)return;state.modal={type:'post',kind};render();return}if(action==='edit-post'){const existing=state.posts.find(p=>p.id===id);const expected=({home:'announcement',orientamento:'opportunity',assemblee:'assembly'})[state.route];if(!existing||existing.kind!==expected)return;state.modal={type:'post',id};render();return}

 if(action==='delete-material')await deleteEntry('material',id);
 if(action==='delete-post')await deleteEntry('post',id);
 }catch(error){console.error(error);toast('Operazione non riuscita: '+error.message)}});
root.addEventListener('input',e=>{if(e.target.id==='material-search'){state.search=e.target.value;const sel=e.target.selectionStart;render();const el=document.querySelector('#material-search');el?.focus();el?.setSelectionRange(sel,sel)}});
root.addEventListener('submit',async e=>{const id=e.target.id;if(id!=='content-form')return;e.preventDefault();if(state.saving)return;const form=e.target;state.saving=true;const saveButton=form.querySelector('[type=submit]');if(saveButton)saveButton.disabled=true;try{if(id==='content-form')await saveContent(form);}catch(err){console.error(err);toast('Errore: '+err.message)}finally{state.saving=false;const liveButton=form.querySelector('[type=submit]');if(liveButton)liveButton.disabled=false}});
window.addEventListener('hashchange',()=>{state.modal=null;state.menu=false;render();window.scrollTo(0,0)});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&(state.menu||state.modal||state.installGuide||state.notificationPanel)){state.modal=null;state.installGuide=false;state.notificationPanel=false;state.menu=false;render()}});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstallPrompt=event;render()});
window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;toast('5AHub installata!');render()});
if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost')) {
 window.addEventListener('load',()=>{navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(err=>console.warn('PWA non disponibile',err))});
}
let poll;async function init(){state.route=routeFromHash();render();if(!db){state.loading=false;render();return}await ensureAnonymousSession();await refreshData({quiet:true});
 try{db.channel('hub-live').on('postgres_changes',{event:'*',schema:'public',table:'hub_posts'},()=>refreshData({quiet:true})).on('postgres_changes',{event:'*',schema:'public',table:'hub_materials'},()=>refreshData({quiet:true})).subscribe()}catch(err){console.warn('Realtime non disponibile',err)}
 poll=setInterval(()=>{if(document.visibilityState==='visible')refreshData({quiet:true})},60000);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshData({quiet:true})})}
init();
})();
