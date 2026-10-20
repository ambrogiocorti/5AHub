# 5AHub — Il portale digitale della classe 5A

Un sito **statico su GitHub Pages** con **contenuti condivisi** attraverso Supabase. Gli studenti leggono senza accedere. I rappresentanti autorizzati gestiscono contenuti e file. È già incluso il calendario Google e il modulo di segnalazione forniti per la classe.

## Funzionalità

- Dashboard e comunicazioni
- Calendario Google incorporato, con apertura diretta
- Agenda settimanale condivisa e messaggio pronto da copiare su WhatsApp
- Materiali maturità: ricerca per materia, caricamento PDF / Word / PowerPoint / Excel / immagini / TXT (massimo 15 MB), link, modifica e rimozione
- Orientamento, viaggio, cena e assemblee
- **Segnala:** modulo Google apribile direttamente; incorporamento quando è disponibile il link embed completo
- Login dei rappresentanti, ruoli amministrativi protetti con Row Level Security
- Aggiornamento automatico dei contenuti tra browser (Realtime con polling di riserva)
- Layout responsive desktop / smartphone

## 1. Pubblicazione su GitHub Pages

1. Su GitHub crea un **nuovo repository** denominato `5AHub` (può essere pubblico). Il progetto non è stato pubblicato automaticamente: questo pacchetto è pronto per il caricamento.
2. Carica **tutti i file del pacchetto** nella radice del repository, mantenendo `site/`, `schema.sql`, `README.md` e `.github/workflows/pages.yml`. Per caricare cartelle dal browser è più facile trascinare i singoli file e mantenere la struttura, oppure usare Git.
3. Scegli la branch `main`.
4. In **Settings → Pages → Build and deployment**, imposta **Source: GitHub Actions**.
5. Nella scheda **Actions**, attendi il workflow "Pubblica 5AHub". Al completamento, il sito è raggiungibile all'indirizzo `https://TUO_USERNAME.github.io/5AHub/` (il nome è case-sensitive).
6. Se vedi un errore di Actions, verifica che Pages e i permessi dei workflow siano abilitati per il repository.

La cartella pubblicata è `site/`. Lo schema SQL e il README non vengono pubblicati sul sito. **GitHub Pages non contiene un database**: la condivisione dei dati avviene tramite il servizio configurato nel punto seguente.

## 2. Backend condiviso (Supabase)

**Usa un nuovo progetto dedicato a 5AHub**, non quello di altre tue applicazioni.

1. Crea un progetto su [Supabase](https://supabase.com/dashboard).
2. Apri **SQL Editor**, incolla il contenuto di `schema.sql` ed esegui lo script una sola volta su un progetto vuoto.
3. Da **Project Settings / API Keys** recupera il **Project URL** (`https://xxx.supabase.co`) e la **publishable key** (`sb_publishable_...`; su progetti vecchi può essere `anon`).
4. Apri `site/config.js` e compila soltanto:
   - `supabaseUrl: 'https://TUO-PROGETTO.supabase.co'`
   - `supabasePublishableKey: 'LA_CHIAVE_PUBBLICABILE'`
5. Carica / aggiorna `site/config.js` su GitHub: il workflow ridistribuirà il sito.

**Non inserire MAI chiavi `service_role`, `secret` o password del database in `config.js` o GitHub.** La publishable key è progettata per essere pubblica, e la sicurezza è applicata con le policy del database.

## 3. Abilitare un rappresentante

Il sito **non consente registrazioni pubbliche** e soltanto gli utenti abilitati possono scrivere. Nel progetto Supabase:

1. Vai a **Authentication → Users → Add user** e crea un account con email e password per il rappresentante; salva una password robusta e non condividerla in chat o nel repository.
2. Copia l'UUID dell'utente creato.
3. In **SQL Editor**, esegui (sostituendo l'UUID reale):

   ```sql
   insert into public.hub_admins (user_id)
   values ('UUID_EFFETTIVO_DELL_UTENTE');
   ```

4. Apri il sito, scegli **Area rappresentanti**, accedi con l'account creato e verifica il permesso di pubblicazione.
5. Per autorizzare un secondo rappresentante, ripeti la procedura con un altro account.

Tutti possono leggere i contenuti pubblicati, ma le operazioni di scrittura e cancellazione vengono verificate **dal database** e non soltanto dal codice della pagina.

## 4. Calendario Google

Il calendario fornito è configurato in `site/config.js`, chiave `googleCalendarEmbed`.

Se è vuoto, controlla che il calendario Google sia condiviso per la visualizzazione da parte dei compagni; il solo fatto di avere un link di incorporamento non rende automaticamente pubblico il calendario.

## 5. Modulo nella pagina Segnala

Il collegamento configurato è:

`https://forms.gle/4tEuYRrfu2mR6uXE9`

Con il link breve `forms.gle`, la pagina **Segnala** mostra un pulsante funzionante per aprire il questionario. Per visualizzare le domande direttamente nella pagina è necessario anche l’URL di incorporamento completo:

1. Apri il modulo originale come proprietario.
2. Usa **Invia → Incorpora HTML** o l'equivalente nel menu Condividi.
3. Copia **solo l'URL** che appare dentro `src="..."` dell'iframe, di solito `https://docs.google.com/forms/d/e/.../viewform?embedded=true`.
4. Incolla l’URL nel campo `googleFormEmbed` di `site/config.js`, lasciando `googleFormUrl` impostato sul link per aprire il questionario.

Non è necessario modificare il codice HTML. Prima di invitare gli studenti a inviare segnalazioni, verifica le impostazioni di raccolta email, accessi e anonimato del modulo.

## 6. Come verificare la condivisione

1. Accedi come rappresentante nel browser A.
2. Carica un PDF in **Maturità** e premi **Salva e pubblica**.
3. Apri il sito in **modalità in incognito** o su un altro telefono (browser B), senza login.
4. Il file deve comparire e potersi aprire anche su B.
5. Modifica la descrizione su A: B vedrà la modifica senza dover importare alcun backup (Realtime o aggiornamento periodico ogni 60 secondi).

Se non funziona, verifica SQL, configurazione di `config.js`, autorizzazioni, bucket e console del browser.

## Sicurezza e privacy

- I materiali sono **pubblici**: non caricare documenti riservati, dati personali, verifiche non autorizzate o materiale protetto senza permesso.
- Le segnalazioni vengono raccolte da **Google Forms**, non dal database di 5AHub. L'anonimato dipende dalle impostazioni del modulo.
- Le password degli amministratori sono gestite da Supabase Auth. Non copiarle nel codice.
- Il login non concede da solo i permessi: servono gli UUID approvati in `hub_admins`.
- Il costo e i limiti dello storage dipendono dal piano del servizio backend; il sito statico è compatibile con GitHub Pages.

## Anteprima locale

Con `config.js` non ancora compilato, il sito mostra un'**anteprima esplicitamente indicata come tale**: le pagine sono navigabili, ma non è possibile pubblicare file condivisi. Per testare una versione con database attivo apri il sito pubblicato o usa un web server locale, per esempio da `site/`:

```bash
python -m http.server 8000
```

Poi visita `http://localhost:8000`.

## Struttura

```
5AHub/
  .github/workflows/pages.yml     pubblicazione GitHub Pages
  schema.sql                       database, RLS, Storage
  README.md                        questa guida
  site/
    index.html
    config.js                     calendario, modulo, backend (chiavi pubbliche)
    assets/
      app.js                       UI e operazioni condivise
      style.css                    interfaccia
      favicon.svg
```