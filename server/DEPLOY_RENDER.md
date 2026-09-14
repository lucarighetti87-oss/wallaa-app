# Wallaa Backend v4.0.19 — Web Portal/Admin

## Nuove variabili Render
Aggiungi come Secret/Environment Variables:

```env
PUBLIC_BASE_URL=https://api.wallaasafety.com
ALLOWED_ORIGINS=https://wallaasafety.com,https://www.wallaasafety.com
ADMIN_BOOTSTRAP_EMAIL=admin@wallaasafety.com
ADMIN_BOOTSTRAP_PASSWORD=UNA_PASSWORD_LUNGA_UNICA_DI_ALMENO_12_CARATTERI
ADMIN_SESSION_HOURS=12
```

`ADMIN_BOOTSTRAP_PASSWORD` serve solo per creare il primo admin quando non esiste. Il database memorizza un hash scrypt, non la password in chiaro.

## Funzioni introdotte
- account_status enabled/disabled
- login Admin separato
- sessioni Admin a scadenza
- audit log amministrativo
- elenco/ricerca clienti
- attivazione Basic/Pro
- disabilitazione/riattivazione account
- dettaglio Guardian e Safety Network
- alert e storico posizione
- endpoint storico alert cliente per il portale web

## Sicurezza
- Non riutilizzare la password della casella email.
- Usa una password admin dedicata e almeno 16-20 caratteri.
- Limita l'accesso al pannello Admin a personale autorizzato.
- Le visualizzazioni di utenti/alert vengono registrate nell'audit log.
- La console Wallaa non deve essere presentata come servizio pubblico di emergenza o sostituto del 112.


## v4.0.20 — Admin bootstrap automatico

Il backend usa di default `admin@wallaasafety.com` come account amministratore.
Imposta su Render `ADMIN_BOOTSTRAP_PASSWORD` con almeno 12 caratteri. A ogni avvio:

- se l'Admin non esiste, viene creato automaticamente;
- se esiste, la password viene sincronizzata con `ADMIN_BOOTSTRAP_PASSWORD`;
- l'account viene riabilitato e le vecchie sessioni Admin vengono invalidate.

Non è più necessario eseguire SQL manuale per creare o ripristinare l'Admin.
