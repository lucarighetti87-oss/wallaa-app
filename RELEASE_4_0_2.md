# Wallaa Personal Safety Ecosystem v4.0.2

Correzione UX e discoverability dopo test su iPhone reale.

## Correzioni principali
- eliminato lo stretching verticale delle schermate generiche che separava intestazioni e contenuti;
- redesign compatto e premium della schermata Contatti di emergenza;
- schermata Posizione ridisegnata: posizione GPS reale anche senza allarme attivo, coordinate, accuratezza, orario e apertura diretta in Apple Maps;
- rimosse le finte strade decorative dalla schermata posizione e dall'Active Alert;
- Connection Guard esposto anche in Impostazioni con ON/OFF e ritardo 30 s / 1 min / 5 min;
- accessi di sicurezza in Impostazioni estesi ad Active Alert e Attività;
- mantenuti Light / Dark / System e i 6 dizionari lingua;
- core BLE/BTHome non modificato.

## Nota Mappe
La schermata mostra i dati GPS reali e apre la posizione in Apple Maps. Una mappa Apple interattiva incorporata richiede una successiva integrazione MapKit/MapKit JS con credenziali Apple dedicate; non viene simulata con strade artificiali.
