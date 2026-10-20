# 5AHub — Attivazione delle notifiche push
Il codice della PWA, la coda DB e il workflow sono già nel repository. **Le notifiche a sito chiuso non sono operative prima di questa configurazione.**

## 1. Crea le tabelle Supabase
Nel progetto Supabase con ID **jpnisxmmhmrfyhicwtbh** apri **SQL Editor** ed esegui [database/notification_setup.sql](./database/notification_setup.sql).
Lo script aggiunge i dati necessari senza eliminare i materiali o gli annunci. Le policy RLS proteggono ogni sottoscrizione: gli studenti possono vedere/modificare solo la propria.
In **Integrations → Data API** verifica che `hub_push_subscriptions` sia esposta; le altre tabelle della coda NON devono concedere permessi alle sessioni degli studenti.

## 2. Aggiungi i segreti su GitHub
Apri **Settings → Secrets and variables → Actions → Secrets** nel repository 5AHub, quindi crea:

| Nome | Valore |
| --- | --- |
| `SUPABASE_URL` | `https://jpnisxmmhmrfyhicwtbh.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | **Service role JWT** da Supabase → Project Settings → API Keys. Mai pubblicarla! |
| `VAPID_PUBLIC_KEY` | Il valore della proprietà `vapidPublicKey` in `site/config.js` |
| `VAPID_PRIVATE_KEY` | La chiave privata VAPID fornita separatamente (non è mai committata) |
| `VAPID_SUBJECT` | Indirizzo di contatto in formato `mailto:indirizzo@example.it` |
| `CALENDAR_ICAL_URL` | Indirizzo pubblico iCal del calendario della classe |

Per `CALENDAR_ICAL_URL` usa **Impostazioni del calendario Google → Integra calendario → Indirizzo pubblico in formato iCal**. L'URL sarà simile a:
`https://calendar.google.com/calendar/ical/7ffe964f51ee0cb269ad5121fe371a78c6321da0dbf8866a5834789cbdb1538a%40group.calendar.google.com/public/basic.ics`

Il feed deve essere realmente accessibile senza login, altrimenti il controllo degli eventi non potrà funzionare.

Non inserire mai le chiavi private o service_role in `site/config.js`, nelle pagine del sito o in commit GitHub.

## 3. Abilita le esecuzioni programmate
In **Settings → Secrets and variables → Actions → Variables**, crea:
`HUB_PUSH_READY` → `true`

Solo dopo aver fatto i primi due passaggi. Il workflow **5AHub · Notifiche push** effettua un controllo circa ogni 10 minuti; GitHub Actions può ritardare o saltare qualche esecuzione.

Dalla scheda **Actions → 5AHub · Notifiche push → Run workflow** avvia la prima sincronizzazione manuale. Le voci del calendario già presenti vengono memorizzate senza generare notifiche arretrate.

## 4. Test dal telefono
1. Installa 5AHub come app dalla schermata Home quando richiesto dal browser (su iPhone usa Safari).
2. Apri la campanella e scegli **Attiva notifiche push**, accettando il permesso del dispositivo.
3. Da **Preferenze** scegli se ricevere nuovi contenuti e/o nuovi eventi del calendario.
4. Pubblica un materiale da un altro browser e controlla la successiva esecuzione di GitHub Actions.
5. Aggiungi un evento Google e ripeti. Il nuovo evento deve apparire nel feed iCal pubblico.

## Limiti
- Le notifiche sono facoltative e non richiedono email o password, ma una sessione anonima viene creata da Supabase.
- Il sito resta pubblico: senza controlli d'accesso chiunque conosca l'URL può pubblicare; valuta limiti anti-abuso e moderazione.
- Sono inviate notifiche solo per **nuove** pubblicazioni ed eventi, non per ogni modifica.
- GitHub Pages da solo non invia le notifiche: è il workflow GitHub Actions a farlo.
