# Wallaa Personal Safety Ecosystem v4.0.5

Release orientata a TestFlight esterno e App Store Review.

## Modifiche principali
- account Wallaa reale con **Crea account / Accedi / Esci**;
- autenticazione per singola installazione iPhone;
- migrazione compatibile delle identità create con v4.0.4;
- rimozione della dipendenza da una chiave API condivisa incorporata nell'app;
- SOS, live tracking, heartbeat, QR, diagnostica e test email richiedono sessione account autenticata;
- Privacy Policy e Termini e Condizioni apribili da onboarding e Impostazioni;
- target iOS limitato a **iPhone portrait** per la prima release App Store;
- build iOS incrementata a **6**;
- debouncing della sincronizzazione profilo per evitare richieste eccessive mentre si digita;
- UI account e area legale rifinite in stile Wallaa premium.

## Core preservato
La logica BLE/BTHome non è stata modificata. I test BTHome restano 3/3.
