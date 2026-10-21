/** 5AHub: authenticated-by-secret notification dispatcher for Supabase Edge Functions.
 * Called immediately on queued content insert (pg_net trigger), and once a minute (pg_cron).
 * Deploy with JWT verification OFF. A separate, high-entropy X-5AHub-Secret is required.
 */
import webpush from 'npm:web-push@3.6.7';
import {readIcalEvents, sha256} from './calendar.ts';

const env=(k: string)=>Deno.env.get(k)?.trim()||'';
const PROJECT=env('SUPABASE_URL').replace(/\/$/,'');
const SERVICE_KEY=env('SUPABASE_SERVICE_ROLE_KEY')||(()=>{try{return JSON.parse(env('SUPABASE_SECRET_KEYS')).default||''}catch{return ''}})();
const WEBHOOK_SECRET=env('HUB_WEBHOOK_SECRET');
const SITE='https://5ahub.it/';
const MAX_ATTEMPTS=7;

type Item={id:number;category:string;title:string;body:string;route:string;author_id:string|null};
type Subscriber={endpoint:string;user_id:string;p256dh:string;auth_secret:string;notify_calendar:boolean;notify_content:boolean};

function requireSettings(){
  const missing=['SUPABASE_URL','HUB_WEBHOOK_SECRET','VAPID_PUBLIC_KEY','VAPID_PRIVATE_KEY'].filter(x=>!env(x));
  if(!SERVICE_KEY)missing.push('SUPABASE_SERVICE_ROLE_KEY o SUPABASE_SECRET_KEYS');
  if(missing.length)throw new Error('Impostazioni mancanti: '+missing.join(', '));
  if(WEBHOOK_SECRET.length<32)throw new Error('HUB_WEBHOOK_SECRET deve contenere almeno 32 caratteri');
  if(!/^https:\/\/[a-z0-9.-]+\.supabase\.co$/i.test(PROJECT))throw Error('SUPABASE_URL non valido');
  const subject=env('VAPID_SUBJECT');
  webpush.setVapidDetails((/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(subject)||/^https:\/\//i.test(subject))?subject:SITE,env('VAPID_PUBLIC_KEY'),env('VAPID_PRIVATE_KEY'));
}

/** Compare SHA-256 bytes to avoid revealing token length or characters during comparison. */
async function validSecret(given: string):Promise<boolean>{
  if(!WEBHOOK_SECRET || !given)return false;
  const [a,b]=await Promise.all([sha256(given),sha256(WEBHOOK_SECRET)]);
  let different=0;
  for(let i=0;i<a.length;i++)different |= a.charCodeAt(i)^b.charCodeAt(i);
  return different===0;
}

async function request(path:string,method='GET',data?:unknown):Promise<any>{
  const res=await fetch(PROJECT+'/rest/v1/'+path,{
    method,headers:{'apikey':SERVICE_KEY,...(SERVICE_KEY.startsWith('eyJ')?{'Authorization':'Bearer '+SERVICE_KEY}:{}),'Content-Type':'application/json',...(method==='GET'?{}:{'Prefer':'return=representation'})},
    ...(data===undefined?{}:{body:JSON.stringify(data)}), signal:AbortSignal.timeout(16000)
  });
  if(!res.ok)throw Error(`Database ${res.status} ${path.split('?')[0]}: ${(await res.text()).slice(0,200)}`);
  return res.status===204?[]:await res.json().catch(()=>[]);
}
const eq=(field:string,value:string|number)=>`${field}=eq.${encodeURIComponent(String(value))}`;

async function syncCalendar():Promise<{added:number;seeded:boolean}|{warning:string}>{
  const address=env('CALENDAR_ICAL_URL');
  if(!address)return {warning:'CALENDAR_ICAL_URL non configurato'};
  const target=new URL(address);
  if(target.protocol!=='https:'||target.hostname!=='calendar.google.com'||!target.pathname.endsWith('.ics')){
    return {warning:'Indirizzo CALENDAR_ICAL_URL non valido'};
  }
  const source=await fetch(target,{signal:AbortSignal.timeout(18000)});
  if(!source.ok) return {warning:`Il feed iCal Google ha risposto HTTP ${source.status}`};
  const events=readIcalEvents(await source.text());
  const boot=(await request('hub_push_state?name=eq.calendar_initialized&select=name')).length>0;
  const known=new Set((await request('hub_calendar_known?select=calendar_uid&limit=10000')).map((r:{calendar_uid:string})=>r.calendar_uid));
  let added=0;
  for(const row of events){
    const uid=await sha256(row.uid);
    if(known.has(uid))continue;
    // RETURN representation; request checks for any conflict before inserting. A single cron job runs each minute.
    await request('hub_calendar_known?on_conflict=calendar_uid','POST',{calendar_uid:uid,title:row.title,start_label:row.startLabel});
    known.add(uid);
    if(boot){
      await request('hub_push_events','POST',{category:'calendar',title:'Nuovo evento: '+row.title,
        body:row.startLabel?'Data: '+row.startLabel:'Apri il calendario della classe',route:'#/calendario'});
      added++;
    }
  }
  if(!boot){
    await request('hub_push_state','POST',{name:'calendar_initialized',value:{at:new Date().toISOString()}});
    console.info('Calendario inizializzato senza notifiche retroattive:',events.length);
  }
  return {added,seeded:!boot};
}

async function sendTo(sub:Subscriber, item:Item){
  const dest=new URL(item.route||'#/home',SITE);
  if(dest.origin!==new URL(SITE).origin || !dest.pathname==='/')throw Error('Target non consentito');
  const payload=JSON.stringify({title:'5AHub · '+item.title.slice(0,100),body:(item.body||'Nuovo contenuto').slice(0,170),url:dest.href,tag:'5ahub-'+item.id});
  return webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth_secret}},payload,{TTL:3600,urgency:'high'});
}

async function dispatch():Promise<{claimed:number;delivered:number;failed:number}>{
  const claims=await request('rpc/hub_claim_push_events','POST',{batch_size:12}) as Item[];
  if(!claims.length)return {claimed:0,delivered:0,failed:0};
  const subscribers=await request('hub_push_subscriptions?select=*&limit=2000') as Subscriber[];
  let delivered=0, failed=0;
  for(const item of claims){
    const sent=new Set((await request(`hub_push_deliveries?${eq('event_id',item.id)}&select=endpoint`)).map((row:{endpoint:string})=>row.endpoint));
    let errors=0;
    // Sequential sends prevent exceeding the Edge Function's resource budget on small class deployments.
    for(const sub of subscribers){
      if(sent.has(sub.endpoint)||item.author_id===sub.user_id||(item.category==='calendar'?!sub.notify_calendar:!sub.notify_content))continue;
      try {
        await sendTo(sub,item);
        await request('hub_push_deliveries','POST',{event_id:item.id,endpoint:sub.endpoint});
        delivered++;
      }catch(ex:any){
        if(ex?.statusCode===404||ex?.statusCode===410){
          await request('hub_push_subscriptions?'+eq('endpoint',sub.endpoint),'DELETE');
        }else {errors++; failed++; console.error('Invio push fallito:',String(ex?.message||ex).slice(0,140));}
      }
    }
    const body=errors?{processing_until:new Date(Date.now()+50000).toISOString(),last_error:`${errors} invii da riprovare`}:{processed_at:new Date().toISOString(),processing_until:null,last_error:null};
    await request('hub_push_events?'+eq('id',item.id),'PATCH',body);
  }
  return {claimed:claims.length,delivered,failed};
}

Deno.serve(async (req:Request)=>{
  if(req.method!=='POST')return new Response('Method not allowed',{status:405});
  if(!await validSecret(req.headers.get('x-5ahub-secret')||''))return new Response('Unauthorized',{status:401});
  try{
    requireSettings();
    const body=await req.json().catch(()=>({}));
    let calendar:unknown=null;
    if(body.action==='calendar')calendar=await syncCalendar().catch(e=>({warning:String(e?.message||e).slice(0,180)}));
    const pushes=await dispatch();
    console.info('5AHub notifications:',JSON.stringify({calendar,pushes}));
    return Response.json({ok:true,calendar,pushes},{headers:{'Cache-Control':'no-store'}});
  }catch(err:any){
    console.error('5AHub Edge Function:',String(err?.message||err).slice(0,220));
    return Response.json({ok:false,error:'Il servizio notifiche ha riscontrato un errore.'},{status:500});
  }
});