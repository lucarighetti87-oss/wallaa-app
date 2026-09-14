# Wallaa Personal Safety Ecosystem v4.0.3

## Fix critici iPhone

- Corretto il foglio **Nuovo/Modifica guardiano** quando appare la tastiera iOS.
  - Il modal segue ora il `visualViewport` reale di Safari/WKWebView.
  - Header del foglio sticky.
  - Campi scrollabili e portati automaticamente in vista quando ricevono il focus.
  - Bottom navigation nascosta durante la tastiera.
  - Blocco dello scroll della pagina sottostante mentre il modal è aperto.
- Corretto il flusso **SOS Press & Hold**.
  - Rimosso il countdown basato esclusivamente su `requestAnimationFrame`.
  - Countdown 3 → 2 → 1 basato su timer assoluti (`Date.now()` + timeout/interval), più robusto in WKWebView.
  - Conferma garantita allo scadere dei 3 secondi anche se gli animation frame vengono rallentati.
  - Cattura del pointer sul pulsante SOS per riconoscere correttamente il rilascio e annullare prima dei 3 secondi.
  - Feedback aptico 3/2/1 e conferma pesante mantenuti.

## Core safety

La logica BLE/BTHome non è stata modificata.
