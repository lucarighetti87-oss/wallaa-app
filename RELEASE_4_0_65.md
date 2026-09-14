# Wallaa App 4.0.65 — build 68

- Heartbeat Sentinel ogni 30 secondi mentre l'app è attiva.
- Ping immediato all'avvio, ritorno in foreground, rete ripristinata e focus.
- Non dipende più dal GET Sentinel/me: il backend ignora automaticamente gli account non-Sentinel.
- Se il GPS è disponibile, ogni heartbeat include la posizione.
- Su iOS sospeso in background non viene promesso un timer continuo: lo stato ONLINE scade correttamente se il sistema sospende l'app.
