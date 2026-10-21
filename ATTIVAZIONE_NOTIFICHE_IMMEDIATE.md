# 5AHub — Notifiche immediate e calendario ogni minuto

## Cosa cambia

- **Nuovo materiale o comunicazione/argomento:** il trigger esistente aggiunge un evento nella coda `hub_push_events`; il nuovo trigger HTTP (pg_net) richiama subito la funzione Edge `hub-notifications`, che invia Web Push ai dispositivi iscritti. Ritardo atteso nell'ordine di pochi secondi, salvo limiti/rete del dispositivo.
- **Nuovo evento Google Calendar:** Supabase Cron richiama la funzione Edge **ogni minuto**, che legge il feed iCal pubblico, confronta gli eventi con quelli già noti e invia avvisi soltanto per i nuovi eventi. Il feed Google può essere aggiornato in ritardo o rispondere da cache: quindi 1 minuto è l'intervallo di controllo, non una garanzia sui tempi di consegna.
- **Notifiche Android:** il badge web push è una PNG trasparente con `5A` bianco, senza bordi o quadrati. Android potrebbe comunque applicare il suo stile di sistema.

## Configurazione: progetto Supabase 5AHub

Questo progetto ha ID **`jpnisxmmhmrfyhicwtbh`**. Le modifiche su GitHub sono già preparate; la parte Supabase richiede un proprietario autorizzato perché il collegamento attuale rifiuta le operazioni di gestione del progetto.

### 1. Pubblica la Edge Function

Nel progetto Supabase, apri **Edge Functions** e crea/deploya la funzione con nome esatto **`hub-notifications`**, usando i file:

- `supabase/functions/hub-notifications/index.ts`
- `supabase/functions/hub-notifications/calendar.ts`
- `supabase/functions/hub-notifications/deno.json`

Il metodo più affidabile per pubblicare più file è usare la Supabase CLI sul repository:

```bash
supabase login
supabase link --project-ref jpnisxmmhmrfyhicwtbh
supabase functions deploy hub-notifications --no-verify-jwt
```

L'opzione `--no-verify-jwt` è necessaria perché le richieste server-to-server vengono protette dal token indipendente `x-5ahub-secret`; non esporre mai tale token nel browser.

### 2. Inserisci i Secret della funzione (non in GitHub!)

Nel progetto Supabase vai a **Edge Functions → Secrets**, e aggiungi:

- `VAPID_PUBLIC_KEY`: uguale a quello già salvato nei GitHub Secrets e in `site/config.js`
- `VAPID_PRIVATE_KEY`: la chiave **privata** corrispondente alla pubblica, già configurata per GitHub Actions
- `VAPID_SUBJECT`: per esempio `https://5ahub.it/` oppure `mailto:tuo-indirizzo@example.com`
- `CALENDAR_ICAL_URL`: l'**indirizzo pubblico iCal** del calendario della classe, da Google Calendar → Impostazioni → Integra calendario (verifica che termini in `.ics` e che funzioni senza login)
- `HUB_WEBHOOK_SECRET`: genera un valore casuale, almeno 32 byte, che dovrà essere **identico** al segreto Vault `hub_notify_token` creato al passo 3.

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` sono generalmente già disponibili automaticamente nelle Edge Functions del progetto; se mancassero controlla la configurazione del servizio, mai inserirle nel sito.

Per generare il token direttamente in SQL Editor:

```sql
select encode(gen_random_bytes(32),'hex') as token_da_copiare;
```

Salva il token **solo nel tuo password manager** e negli appositi campi Secrets. Non inviarlo in chat e non inserirlo in file del repository.

### 3. Configura Supabase Vault e attiva trigger + cron

In **Supabase → SQL Editor**, esegui le due istruzioni sostituendo `TOKEN_CASUALE` con il medesimo valore di `HUB_WEBHOOK_SECRET`:

```sql
select vault.create_secret(
  'https://jpnisxmmhmrfyhicwtbh.supabase.co/functions/v1/hub-notifications',
  'hub_notify_endpoint'
);
select vault.create_secret('TOKEN_CASUALE','hub_notify_token');
```

Quindi copia ed esegui **una sola volta** il contenuto di `database/push_realtime_setup.sql`. Assicurati che il precedente `database/notification_setup.sql` sia già stato applicato: serve per le sottoscrizioni, coda e trigger degli eventi.

Questo script abilita `pg_net` e `pg_cron`, aggiunge i trigger immediati e pianifica un controllo iCal ogni minuto. Se la funzione o i Vault Secret non sono pronti, non attivare ancora il cron.

### 4. Disattiva il vecchio invio GitHub programmato

Apri **GitHub → Settings → Secrets and variables → Actions → Variables**. Imposta la variabile `HUB_DELIVERY_MODE` con valore `supabase` **solo dopo aver verificato** che le notifiche Supabase funzionino.

Il workflow GitHub in repository ha una condizione che lo disattiva quando questa variabile vale `supabase`. Puoi lasciare `HUB_PUSH_READY=true` durante il test e spegnerlo successivamente. Non mantenere due dispatcher contemporaneamente: potrebbero inviare la stessa notifica due volte.

### 5. Verifica

1. Sul telefono apri 5AHub, consenti notifiche e scegli le preferenze (se già attive non occorre reinscriversi).
2. Da un altro browser pubblica un contenuto di prova. Controlla l'arrivo della notifica **in pochi secondi** e i log Edge Functions.
3. Esegui un primo controllo cron: vengono memorizzati gli eventi già presenti **senza notifiche arretrate**.
4. Aggiungi un **nuovo** evento al calendario Google. Dopo un controllo cron (circa un minuto, salvo ritardi del feed) dovrebbe arrivare la notifica.
5. Se non arrivano avvisi, verifica in Supabase **Cron Jobs**, **Edge Functions Logs** e nella tabella `hub_push_events` se ci sono eventi non processati.

### Sicurezza e limiti

- Non mettere mai `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY` o `HUB_WEBHOOK_SECRET` in file pubblici, client JS o repository GitHub.
- La chiave VAPID privata deve corrispondere alla chiave pubblica utilizzata quando gli studenti hanno attivato gli avvisi; se cambi coppia di chiavi, dovranno reinscriversi.
- Senza login non è possibile verificare che tutti i visitatori siano davvero della classe; attiva le protezioni anti-abuso sul sito.
- Le notifiche inviate ai dispositivi sono controllate anche dai sistemi operativi (permessi, batteria, rete, modalità Non disturbare): la consegna non è garantita in tempo reale.
### Passaggio al dominio 5ahub.it (ottobre 2026)

- L'indirizzo pubblico e i link Web Push puntano ora a **https://5ahub.it/**; **la stessa Edge Function e lo stesso database Supabase restano attivi**.
- Le modifiche a `supabase/functions/hub-notifications/**` avviano automaticamente il workflow di distribuzione `deploy-edge.yml` su `main`. Verificare l'esito nella scheda GitHub Actions prima di eseguire un test.
- Non cambiare le chiavi VAPID, il token di sicurezza né gli URL Vault `hub_notify_endpoint`/`hub_notify_token`: continuano a puntare alla funzione Supabase, non al dominio della PWA.
- I dispositivi che ricevevano push dal vecchio dominio devono aprire **https://5ahub.it/**, reinstallare l'app se necessario e attivare nuovamente gli avvisi. Permessi browser e sottoscrizioni push non si spostano da un'origine a un'altra.
- Creare un nuovo contenuto da un browser diverso per testare l'invio e verificare che la notifica apra `https://5ahub.it/#/...`.
- Vecchie sottoscrizioni possono restare in archivio fino all'invalidazione; non cancellare indiscriminatamente le righe perché potrebbero esserci già nuove iscrizioni sul dominio aggiornato.
