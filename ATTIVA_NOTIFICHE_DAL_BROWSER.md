# Attivare le notifiche rapide di 5AHub senza installare programmi

**Stato:** tutti i file sono su GitHub; la modifica del database Supabase richiede ancora il proprietario del progetto `jpnisxmmhmrfyhicwtbh`.

## 1) Prepara due nuove credenziali GitHub Actions

Apri [Repository Secrets](https://github.com/ambrogiocorti/5AHub/settings/secrets/actions).

- `SUPABASE_ACCESS_TOKEN`: genera un **Personal Access Token** dal [tuo account Supabase](https://supabase.com/dashboard/account/tokens) con accesso al progetto 5AHub. Incollalo solo nel Secret GitHub.
- `HUB_WEBHOOK_SECRET`: una password casuale di almeno 32 caratteri che useremo sia nel Secret GitHub sia in Supabase Vault. Da [Supabase SQL Editor](https://supabase.com/dashboard/project/jpnisxmmhmrfyhicwtbh/sql/new) puoi generarla così:

```sql
select encode(gen_random_bytes(32),'hex') as hub_webhook_secret;
```

Copia e conserva il risultato privatamente. Non mandarlo in chat e non inserirlo nel repository.

Controlla che siano presenti anche i Secrets GitHub già usati dal sistema precedente: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CALENDAR_ICAL_URL`. Le chiavi VAPID devono essere quelle già usate dalla PWA.

## 2) Pubblica la funzione Edge dal browser

Vai in [Actions → Distribuisci notifiche Supabase](https://github.com/ambrogiocorti/5AHub/actions/workflows/deploy-edge.yml) e scegli **Run workflow** sulla branch `main`.

Questo workflow distribuisce `hub-notifications` nel progetto corretto e salva automaticamente i Secrets Supabase necessari. La funzione richiede comunque l'header privato `x-5ahub-secret`; la verifica JWT generica è disabilitata per le sole chiamate server-to-server.

## 3) Collega il database alla funzione e programma il calendario

In [Supabase SQL Editor](https://supabase.com/dashboard/project/jpnisxmmhmrfyhicwtbh/sql/new), esegui quanto segue sostituendo **TOKEN_GENERATO** con il medesimo `HUB_WEBHOOK_SECRET` del punto 1:

```sql
select vault.create_secret(
 'https://jpnisxmmhmrfyhicwtbh.supabase.co/functions/v1/hub-notifications',
 'hub_notify_endpoint'
);
select vault.create_secret('TOKEN_GENERATO','hub_notify_token');
```

Poi esegui **[database/push_realtime_setup.sql](./database/push_realtime_setup.sql)** nello stesso progetto. Lo script attiva i trigger di invio immediato e `pg_cron` ogni minuto. Non inserire il token dentro file GitHub.

Se avevi già eseguito lo script, non ricreare due segreti con lo stesso nome: gestiscili dalla sezione Supabase Vault.

## 4) Testa e disabilita il vecchio polling

- Attiva la campanella di 5AHub sul telefono, poi pubblica un nuovo contenuto da un altro browser. La notifica dovrebbe partire in pochi secondi.
- Apri [Supabase Cron Jobs](https://supabase.com/dashboard/project/jpnisxmmhmrfyhicwtbh/integrations/cron) e controlla che il job `5ahub-calendar-one-minute` sia attivo. Aggiungi un nuovo evento **dopo la prima sincronizzazione** e attendi un controllo: il feed Google potrebbe avere una latenza propria.
- Solo dopo il test, crea nelle [GitHub Actions Variables](https://github.com/ambrogiocorti/5AHub/settings/variables/actions) la variabile `HUB_DELIVERY_MODE` con valore `supabase`. Questo impedisce il doppio invio da GitHub Actions.

Per i dettagli consulta [ATTIVAZIONE_NOTIFICHE_IMMEDIATE.md](./ATTIVAZIONE_NOTIFICHE_IMMEDIATE.md).

**Nota:** il link pubblico del sito non richiede login, ma non consente di limitare l'accesso ai soli compagni. Le notifiche dipendono dalle impostazioni del dispositivo; l’intervallo di controllo è un minuto, non un tempo di consegna garantito.

## Cambio dominio (5ahub.it)

Il sito e i collegamenti push usano ora `https://5ahub.it/`. L'endpoint Supabase in Vault non cambia. La distribuzione della funzione parte automaticamente se cambia il codice su GitHub (`main`). Riattiva le notifiche dal nuovo dominio; gli abbonamenti del vecchio URL non sono trasferibili automaticamente.
