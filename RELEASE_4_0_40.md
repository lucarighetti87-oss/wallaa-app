# Wallaa iOS 4.0.40 — SOS Guardian Live Tracking Fix

Correzioni:
- Il Guardian conserva il link live anche quando la push arriva prima del primo fix GPS.
- La schermata SOS del Guardian aggiorna l'alert dal backend ogni 3 secondi mentre è aperta.
- Il pulsante `Posizione live` è disponibile anche durante l'acquisizione del primo fix GPS.
- Durante un SOS Pro la posizione viene pubblicata ogni ~4 secondi in foreground.
- Su iOS il monitor nativo continua a pubblicare la posizione dell'alert quando l'app passa in background, sfruttando CoreLocation e `UIBackgroundModes=location` già configurato.
- Il tracking nativo si arresta automaticamente quando il backend segnala alert chiuso/non disponibile.
- Backend di riferimento incluso nel pacchetto aggiornato alla 4.0.28.

Versione app: 4.0.40
Build: 43
