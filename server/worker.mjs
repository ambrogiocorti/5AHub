import push from 'web-push';
import {createHash} from 'node:crypto';
const E=process.env;
const needed=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','VAPID_PUBLIC_KEY','VAPID_PRIVATE_KEY','VAPID_SUBJECT'];
const missing=needed.filter(x=>!E[x]);
if(missing.length){console.error('Missing secrets:',missing.join(','));process.exit(1)}
const url=E.SUPABASE_URL.replace(/\/$/,'');
if(!/^https:\/\/[a-z0-9.-]+\.supabase\.co$/i.test(url))throw Error('Invalid Supabase URL');
const site=new URL(E.SITE_URL||'https://ambrogiocorti.github.io/5AHub/');
push.setVapidDetails(E.VAPID_SUBJECT,E.VAPID_PUBLIC_KEY,E.VAPID_PRIVATE_KEY);
async function api(path,method='GET',body){
 const reply=await fetch(url+'/rest/v1/'+path,{
  method,
  headers:{apikey:E.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+E.SUPABASE_SERVICE_ROLE_KEY,
   'Content-Type':'application/json',Prefer:'return=minimal'+(path.includes('on_conflict=')?',resolution=ignore-duplicates':'')},
  ...(body===undefined?{}:{body:JSON.stringify(body)}),
  signal:AbortSignal.timeout(20000)
 });
 if(!reply.ok)throw Error('Supabase '+reply.status+' '+path.split('?')[0]+': '+(await reply.text()).slice(0,400));
 return reply.status===204?[]:await reply.json().catch(()=>[]);
}
const eq=(k,v)=>k+'=eq.'+encodeURIComponent(String(v));
function ics(text){
 if(!text.includes('BEGIN:VCALENDAR'))throw Error('Invalid Google Calendar iCal feed');
 const lines=text.replace(/\r\n/g,'\n').replace(/\n[ \t]/g,'').split('\n');
 let ev=null;const events=[];
 for(const line of lines){
  if(line==='BEGIN:VEVENT'){ev={};continue}
  if(line==='END:VEVENT'){if(ev?.UID&&ev?.SUMMARY&&ev.STATUS!=='CANCELLED')events.push(ev);ev=null;continue}
  if(!ev)continue;
  const at=line.indexOf(':');if(at<0)continue;
  const field=line.slice(0,at).split(';')[0].toUpperCase();
  if(['UID','SUMMARY','DTSTART','STATUS','RECURRENCE-ID'].includes(field))ev[field]=line.slice(at+1);
 }
 return events.slice(0,3000).map(x=>{
  const m=x.DTSTART?.match(/^(\d{4})(\d{2})(\d{2})/);
  return {calendar_uid:createHash('sha256').update(x.UID+':'+(x['RECURRENCE-ID']||'')).digest('hex'),
   title:x.SUMMARY.replace(/\\[nN]/g,' ').replace(/\\,/g,',').slice(0,140),
   start_label:m?m[3]+'/'+m[2]+'/'+m[1]:''};
 });
}
async function calendar(){
 if(!E.CALENDAR_ICAL_URL){console.log('Calendar feed not configured');return}
 const source=new URL(E.CALENDAR_ICAL_URL);
 if(source.protocol!=='https:'||source.hostname!=='calendar.google.com'||!source.pathname.endsWith('.ics'))throw Error('Invalid CALENDAR_ICAL_URL');
 const response=await fetch(source,{signal:AbortSignal.timeout(25000)});
 if(!response.ok)throw Error('Google Calendar iCal returned '+response.status);
 const entries=ics(await response.text());
 const boot=(await api('hub_push_state?name=eq.calendar_initialized&select=value')).length>0;
 const known=new Set((await api('hub_calendar_known?select=calendar_uid&limit=10000')).map(x=>x.calendar_uid));
 let additions=0;
 for(const x of entries){
  if(known.has(x.calendar_uid))continue;
  await api('hub_calendar_known?on_conflict=calendar_uid','POST',x);known.add(x.calendar_uid);
  if(boot){
   await api('hub_push_events','POST',{category:'calendar',title:'Nuovo evento: '+x.title,
    body:x.start_label?'Data: '+x.start_label:'Apri il calendario per i dettagli',route:'#/calendario'});
   additions++;
  }
 }
 if(!boot){
  await api('hub_push_state','POST',{name:'calendar_initialized',value:{at:new Date().toISOString()}});
  console.log('First calendar sync: '+known.size+' existing events indexed; none notified');
 }else console.log('New calendar events: '+additions);
}
async function deliver(){
 const subscribers=await api('hub_push_subscriptions?select=*&limit=2000');
 const queued=await api('hub_push_events?processed_at=is.null&select=*&order=id.asc&limit=75');
 console.log('Queued events:',queued.length,'devices:',subscribers.length);
 for(const ev of queued){
  const sent=new Set((await api('hub_push_deliveries?'+eq('event_id',ev.id)+'&select=endpoint')).map(x=>x.endpoint));
  let failed=0;
  for(const s of [...subscribers]){
   if(sent.has(s.endpoint) || ev.author_id===s.user_id ||
     (ev.category==='calendar'?!s.notify_calendar:!s.notify_content))continue;
   try{
    const dest=new URL(ev.route||'#/home',site);
    if(dest.origin!==site.origin||!dest.pathname.startsWith(site.pathname))throw Error('Unsafe push target');
    await push.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth_secret}},JSON.stringify({
     title:'5AHub · '+String(ev.title).slice(0,95),
     body:String(ev.body||'Nuovo contenuto pubblicato').slice(0,200),
     url:dest.href,tag:'5ahub-'+ev.id
    }),{TTL:3600,urgency:'normal'});
    await api('hub_push_deliveries','POST',{event_id:ev.id,endpoint:s.endpoint});
   }catch(err){
    if([404,410].includes(err.statusCode)){
     await api('hub_push_subscriptions?'+eq('endpoint',s.endpoint),'DELETE');
     const index=subscribers.indexOf(s);if(index>=0)subscribers.splice(index,1);
    }else{failed++;console.warn('Push delivery error:',String(err?.message||err).slice(0,180))}
   }
  }
  if(!failed)await api('hub_push_events?'+eq('id',ev.id),'PATCH',{processed_at:new Date().toISOString()});
 }
}
try{await calendar().catch(e=>console.warn('Calendar sync:',e.message));await deliver();}
catch(e){console.error('Push dispatcher:',e.message);process.exitCode=1}
