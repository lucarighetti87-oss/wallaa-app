# Wallaa Personal Safety Ecosystem v4.0.1

Questa revisione nasce dal test su iPhone reale della prima v4.0.

## Correzioni funzionali

- Il QR personale della Rete Wallaa viene ora ricostruito anche dal token già salvato localmente, quindi resta visibile se il backend è temporaneamente offline dopo una prima registrazione riuscita.
- La schermata Rete distingue chiaramente QR sincronizzato, QR in cache e QR non ancora generato.
- Aggiunti retry espliciti e messaggi di errore backend nella schermata QR.
- Aggiunto endpoint backend autenticato `/api/system/diagnostics` per verificare API key, PostgreSQL, SMTP e APNs.
- Aggiunto endpoint `/api/system/test-email` e relativo pulsante nell'app per verificare l'invio SMTP senza attivare un'emergenza.
- AppDelegate include direttamente i callback Capacitor per la registrazione APNs.

## Accessibilità delle funzioni

La Home ora espone accessi rapidi a:

- My Button / Connection Guard
- Safety Network & QR
- Emergency Contacts
- Location
- test del sistema

Le stesse funzioni sono raggiungibili dalla nuova sezione "Controlli di sicurezza" nelle Impostazioni.

## UI/UX

- Home più coinvolgente con aurora dinamica, status chip, profondità sulle card e SOS con pulse controllato.
- Quick actions in stile glass/premium.
- Dashboard servizi in Impostazioni con LED di stato.
- Light e Dark Mode mantenute; Active Alert resta high-contrast.

## Nota backend

Email e QR validi sono funzioni backend. Per funzionare in una build iPhone devono essere configurati `VITE_API_BASE_URL`, `VITE_ALERT_API_URL` e `VITE_ALERT_API_KEY`, e sul server devono risultare operativi `APP_API_KEY`, PostgreSQL e SMTP.
