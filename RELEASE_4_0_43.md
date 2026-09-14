# Wallaa 4.0.43 — BLE Background Reliability

Versione: 4.0.43
Build: 46

Release tecnica dedicata all'affidabilità del Wallaa Button quando l'app non è in primo piano.

## Correzioni principali

- Il monitor BLE nativo iOS ora possiede la scansione quando l'app entra in background.
- Il monitor JavaScript/Capacitor interrompe la propria scansione quando la WebView diventa hidden e la riavvia al ritorno in foreground.
- La scansione nativa viene riarmata entrando in background e dopo ogni advertisement del Wallaa Button associato.
- Il riarmo serve a compensare il comportamento iOS che filtra/coalesca gli advertisement duplicati in background.
- Ridotta la finestra di deduplicazione hardware: non vengono più ignorate per 12 secondi pressioni legittime con packet id mancante/riutilizzato.
- Il restoration identifier Core Bluetooth resta identico a quello storico (`it.wallaa.safebutton.background.central.v407`) ed è ora anche persistito in UserDefaults.
- Aggiunto logging nativo dettagliato `[WALLAA][BLE]` e `[WALLAA][SOS]` per capire esattamente se un fallimento avviene in scansione, decodifica, trigger o rete.
- Invio SOS nativo: fino a 3 tentativi su errore HTTP/rete quando è disponibile `eventPacketId`, sfruttando la deduplicazione server già presente.
- `UIBackgroundModes` mantiene `bluetooth-central`, `location` e `remote-notification`.

## Limite iOS da non confondere con un bug

Se l'utente esegue un force-quit manuale dell'app dal selettore iOS, Core Bluetooth non garantisce il rilancio dell'app per l'evento del pulsante. Questa condizione deve essere testata separatamente dal normale background/schermo bloccato.

## Test aggiunti

`tests/v443-background-reliability.test.mjs`

Verifica:
- ownership foreground/background della scansione;
- re-arm scan dopo discovery;
- restoration identifier stabile;
- dedupe breve;
- retry rete SOS;
- background mode iOS.
