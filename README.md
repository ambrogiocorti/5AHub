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

In **Settings → Pages → Build and deployment**, seleziona **GitHub Actions**. Il workflow in `.github/workflows/pages.yml` pubblica la cartella `site` su https://5ahub.it/.

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

## Notifiche push immediate

- **Materiali, comunicazioni, orientamento, assemblee:** i nuovi contenuti vengono inviati in push attraverso un trigger `pg_net` che chiama la Edge Function Supabase `hub-notifications` immediatamente dopo il salvataggio. Tempi di consegna soggetti al browser e alla rete.
- **Google Calendar:** il job Supabase Cron `5ahub-calendar-one-minute` confronta il feed iCal ogni minuto e notifica i nuovi eventi. Il feed di Google può avere ritardi indipendenti.
- **Campanella:** consente di abilitare/disabilitare le notifiche, consultare gli aggiornamenti recenti e impostare le preferenze per contenuti e calendario. Gli avvisi arrivano anche con la PWA chiusa, se il dispositivo supporta Web Push.
- **Android:** icona monocromatica `site/assets/badge-96.png` con solo «5A»; l'aspetto può dipendere dal sistema operativo.
- **Sicurezza:** le credenziali restano su Supabase/GitHub Actions Secrets, mai nel frontend. Non modificare la coppia VAPID per cambiare dominio.

### Dominio ufficiale

Il sito ufficiale è **https://5ahub.it/**, configurato come custom domain di GitHub Pages. La Edge Function usa lo stesso dominio per i collegamenti nelle notifiche. Il codice della funzione viene distribuito automaticamente dal workflow `.github/workflows/deploy-edge.yml` quando cambia `supabase/functions/hub-notifications/**`.

**Dopo il cambio di dominio:** le autorizzazioni e le sottoscrizioni Web Push del vecchio `ambrogiocorti.github.io` non vengono trasferite. Apri https://5ahub.it/ su ogni dispositivo, reinstalla la PWA dal nuovo dominio se necessario e riattiva le notifiche dalla campanella. Non serve cambiare la chiave VAPID. Le vecchie sottoscrizioni possono rimanere temporaneamente nel database fino alla scadenza o alla pulizia.

Per la configurazione iniziale e la risoluzione degli errori consulta [ATTIVAZIONE_NOTIFICHE_IMMEDIATE.md](./ATTIVAZIONE_NOTIFICHE_IMMEDIATE.md). Il vecchio workflow GitHub programmato è disabilitato quando la variabile `HUB_DELIVERY_MODE` vale `supabase`.
