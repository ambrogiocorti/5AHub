# 5AHub — Portale classe 5A

Portale statico distribuito tramite **GitHub Pages** con contenuti condivisi tramite Supabase. La pubblicazione non richiede email, password o registrazione: il browser crea una sessione anonima automaticamente.

## Sezioni attive

- **Panoramica:** comunicazioni della classe
- **Calendario:** Google Calendar incorporato, senza agenda settimanale separata
- **Maturità:** carica e condividi PDF, Word, PowerPoint, Excel e immagini (fino a 15 MB)
- **Orientamento:** opportunità e annunci
- **Assemblee:** idee e argomenti, con possibilità di pubblicare
- **Segnala:** Google Forms incorporato direttamente nella pagina

I moduli di pubblicazione scelgono automaticamente la categoria dalla sezione in cui ti trovi; non esiste un menu per selezionare la categoria. La rimozione dei propri post resta consentita alla sessione anonima originale.

## Pulizia del database esistente

Se avevi già creato 5AHub prima di questo aggiornamento, devi eseguire nel **SQL Editor del progetto Supabase collegato** il file [pulizia_database.sql](pulizia_database.sql). Questa operazione elimina definitivamente **tutti i post** classificati come `trip` e `dinner` e **l'intera tabella `hub_weekly`**, ormai inutilizzata. Non elimina i materiali per la maturità, né le comunicazioni, l'orientamento e le assemblee.

> La migrazione non viene eseguita automaticamente da GitHub Pages. Prima di eseguirla puoi esportare o salvare i dati che vuoi conservare.

**Nuova installazione:** usare il file [schema.sql](schema.sql) e non eseguire la migrazione di pulizia.

## Pubblicazione su GitHub Pages

Repository: https://github.com/ambrogiocorti/5AHub

In **Settings → Pages → Build and deployment**, seleziona **GitHub Actions**. Il workflow in `.github/workflows/pages.yml` pubblica la cartella `site` su https://ambrogiocorti.github.io/5AHub/.

## Configurazione Supabase

1. Abilita **Allow new users to sign up** e **Allow anonymous sign-ins**.
2. In `site/config.js` inserisci solo Project URL e chiave **publishable**, mai chiavi segrete.
3. Per una prima installazione esegui `schema.sql` su un database vuoto.
4. Proteggi il servizio dall'abuso: la piattaforma pubblica non può verificare chi appartiene realmente alla classe.

## Google Forms

Il modulo per le segnalazioni è incorporato in pagina con l'URL `googleFormEmbed` di `site/config.js` e non richiede di aprire una nuova scheda. Se Google ne impedisce l'incorporamento, verifica le impostazioni del modulo e il relativo URL.


## Installazione come web app (PWA)

La cartella `site/` include `manifest.webmanifest`, `sw.js` e icone PNG 192/512. Con GitHub Pages (HTTPS):

- **Android / Chrome:** apri il sito, scegli **Installa** o menu Chrome → **Installa app**.
- **iPhone / Safari:** apri la pagina, tocca **Condividi** → **Aggiungi alla schermata Home** (l'installazione non parte automaticamente su iOS).
- **Windows / Edge / Chrome:** usa il pulsante **Installa** o l'icona di installazione accanto alla barra indirizzi.

Il Service Worker mantiene in cache il guscio grafico dell'app: **contenuti Supabase, Google Calendar e Google Forms richiedono internet**. Per testare la PWA va usato HTTPS o localhost, non un file aperto con `file://`.

## Notifiche: versione implementata e limiti

- La campanella conserva un elenco locale dei nuovi contenuti pubblicati (comunicazioni, materiali, orientamento, assemblee) rilevati **quando apri o tieni aperto 5AHub**. I nuovi post vengono ricevuti tramite Supabase Realtime, con aggiornamento periodico quando il sito è visibile.
- Puoi abilitare **avvisi del dispositivo mentre il sito rimane aperto**. Serve permesso esplicito del browser; su iPhone la web app deve essere aggiunta alla schermata Home.
- La sincronizzazione **push a sito completamente chiuso non è ancora attiva**: serve configurare sul server il Web Push (VAPID, sottoscrizioni per dispositivo, invio tramite Edge Function / server). Il Service Worker contiene già l'ascoltatore `push`.
- **Google Calendar non alimenta automaticamente le notifiche**. Il calendario visualizzato è solo un iframe; per gli avvisi sui nuovi eventi occorre Google Calendar API / un trigger Google Apps Script + server Web Push. Non mettere credenziali OAuth, VAPID private o service_role nella repository pubblica.
- Le notifiche di contenuto vengono memorizzate **soltanto sul dispositivo dell'utente** (storage locale). Eliminare dati del browser può far perdere storico e permessi.

### Perché non inviare subito push a sito chiuso?

GitHub Pages ospita solo file statici: non può eseguire codice server per mandare Web Push. Occorrono un server di invio, registrazione dei dispositivi e credenziali segrete conservate lato server. Un calendario Google dentro iframe non permette di intercettare direttamente la creazione di eventi. È necessario un secondo passaggio di configurazione lato backend prima di promettere questo comportamento agli studenti.
