# 5AHub — Portale digitale della 5A

Sito statico, ospitabile su **GitHub Pages**, con contenuti comuni e file per la maturità memorizzati in **Supabase**. Nessuna schermata di accesso: tutti possono creare comunicazioni, iniziative, argomenti e materiali. Ogni visitatore ottiene automaticamente una *sessione tecnica anonima* senza inserire email o password.

> **Attenzione:** senza una verifica dell'identità o un accesso riservato, **chiunque trovi il sito** può pubblicare, non solo gli studenti della 5A. Non pubblicare dati personali, valutazioni, foto non autorizzate, informazioni riservate o file di cui non si posseggono i diritti. Per un impiego pubblico continuativo è opportuno prevedere moderazione, protezione antispam e limiti di traffico.

## Cosa include

- Dashboard con comunicazioni collettive
- Google Calendar incorporato
- Materiali maturità condivisi per materia: PDF, Word, PowerPoint, Excel, immagini e TXT, fino a 15 MB
- Orientamento, viaggio, cena di fine anno e assemblee
- **Pubblica contenuti**: tutti possono aggiungere file, comunicazioni e proposte senza registrarsi
- **Modifica / elimina soltanto i propri contenuti**: la proprietà è collegata alla sessione anonima del browser; dopo aver cancellato i dati del sito o cambiato dispositivo può non essere più possibile modificare ciò che si è pubblicato
- Pagina Segnala con Google Forms
- Aggiornamenti visibili su altri dispositivi tramite Supabase Realtime (con aggiornamento periodico di riserva)
- Interfaccia responsive per smartphone e computer

## 1. Attivazione di GitHub Pages

Repository: https://github.com/ambrogiocorti/5AHub

1. Apri **Settings → Pages** nel repository.
2. In **Build and deployment**, imposta **Source: GitHub Actions**.
3. Nella scheda **Actions**, esegui il workflow `Pubblica 5AHub` se non parte automaticamente.
4. Controlla che l'esecuzione sia completata senza errori.
5. URL atteso: https://ambrogiocorti.github.io/5AHub/

Il workflow pubblica solamente `site/`. Lo script `schema.sql` **non** viene eseguito da GitHub e deve essere applicato separatamente al database.

## 2. Configurazione del database condiviso

La configurazione client è in `site/config.js`: contiene soltanto URL e **publishable key** del progetto Supabase, non password o chiavi segrete.

**Servono due passaggi nel progetto Supabase che corrisponde all'URL in `site/config.js`:**

1. Apri **SQL Editor** ed esegui integralmente `schema.sql`. Lo script è progettato per uno schema nuovo oppure per aggiornare le policy della versione precedente conservando i contenuti.
2. Apri **Authentication → Providers → Anonymous** e attiva **Anonymous Sign-Ins**.

A quel punto il browser crea automaticamente la sessione anonima e l'utente vede i pulsanti **Pubblica**, **Carica un materiale**, **Aggiungi contenuto**. Non appare alcun login.

**Sicurezza:** nel database è abilitata la Row Level Security; tutti possono leggere e inserire, mentre modifica ed eliminazione richiedono che l'elemento appartenga alla stessa sessione che lo ha creato. La rimozione dei file dallo Storage usa lo stesso principio. Le modifiche alla vecchia agenda settimanale sono disabilitate per impedire sovrascritture anonime: il calendario Google resta visibile a tutti e le comunicazioni consentono di pubblicare ulteriori promemoria.

**Limiti applicati:** tipi MIME consentiti per lo Storage, file fino a 15 MB, limiti per sessione di 20 materiali e 30 comunicazioni nelle 24 ore. Questi controlli **non impediscono** a un utente malevolo di creare nuove sessioni. In caso di spam configura CAPTCHA/Turnstile per l'Auth, una coda di moderazione e rate limiting lato server o tramite un proxy.

**Importante:** se nella versione precedente sono stati caricati file da account rappresentanti, i record preesistenti rimangono visibili ma senza un proprietario anonimo assegnato. Non saranno modificabili tramite la nuova interfaccia senza intervento amministrativo sul database.

## 3. Come verificare che le modifiche siano condivise

1. Apri il sito da un browser normale.
2. Vai su **Pubblica contenuti** e aggiungi una comunicazione di prova.
3. Apri il sito da un secondo browser o da uno smartphone: la comunicazione dovrebbe apparire anche lì.
4. Dal browser che ha pubblicato l'elemento, modifica il testo e poi elimina la prova.
5. Ripeti caricando un piccolo PDF in **Maturità**; da un altro dispositivo verifica che il file si apra.

Se compare “Pubblicazione momentaneamente non disponibile”, controlla che **Anonymous Sign-Ins** sia attivo e che `schema.sql` sia stato eseguito **nel progetto giusto**. Se appare “permission denied” o un errore RLS, verifica di aver eseguito tutto lo script SQL.

## 4. Calendario e segnalazioni

- **Calendario**: viene caricato direttamente dall'URL Google Calendar di classe già configurato.
- **Segnala**: il pulsante porta al modulo Google già fornito. Per incorporarlo completamente nella pagina devi configurare in `site/config.js` un URL `https://docs.google.com/forms/.../viewform?embedded=true` come `googleFormEmbed` (solo URL, non un tag HTML intero).

## 5. Struttura

```text
5AHub/
├── .github/workflows/pages.yml
├── site/
│   ├── index.html
│   ├── config.js
│   ├── .nojekyll
│   └── assets/
│       ├── app.js
│       ├── style.css
│       └── favicon.svg
├── schema.sql
└── README.md
```

## 6. Privacy e accessibilità

Il link al sito non limita l'accesso alla sola classe. I file nel bucket di archiviazione sono **pubblici**. Non usarlo per segnalazioni personali o delicate: per quelle utilizza il modulo Segnala o i canali scolastici appropriati, facendo attenzione ai dati inseriti.

Per esigenze di moderazione e ripristino dei contenuti, può essere utile attivare una revisione delle pubblicazioni prima che vengano mostrate: questa versione **non include moderazione preventiva**.

### Se compare «Pubblicazione momentaneamente non disponibile»

Nelle impostazioni **Authentication → Providers / Sign In & Sign Up** del progetto Supabase corretto:

- **Allow new users to sign up: ON**. Serve anche alla creazione automatica degli utenti anonimi.
- **Allow anonymous sign-ins: ON**. È il metodo utilizzato da `signInAnonymously()`.
- **Allow manual linking:** non necessario.
- **Confirm email:** irrilevante per gli accessi anonimi (non viene usata un'email).

Salva le modifiche, aggiorna la pagina web forzando il caricamento (Ctrl+F5) e leggi l'eventuale nuovo messaggio. Se hai attivato **CAPTCHA** nel backend, la sola attivazione della funzione non basta: devi integrare il CAPTCHA nella procedura di accesso anonimo sul sito e inviare `captchaToken`.

Se appare un errore di RLS o «permission denied», verifica che lo schema SQL più recente sia stato eseguito nel **progetto collegato a `site/config.js`**. Il sito è pubblico e chiunque conosca il link potrebbe creare contributi: valuta moderazione e protezione antispam.
