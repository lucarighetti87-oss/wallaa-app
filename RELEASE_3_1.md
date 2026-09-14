# Wallaa Safe Button 3.1 — Premium UI & Languages

Questa release parte dalla 3.0 e mantiene QR, Rete Wallaa, APNs, SMTP, GPS e Wallaa Button.

## Modifiche richieste

1. Home: nuovo brand statement **WHEN SAFETY CAN’T WAIT. PRESS WALLAA.**
2. Attività: nuova dashboard premium con riepilogo e feed eventi più leggibile.
3. Conferma alert: toast scuro premium e schermata di successo ridisegnata con stato posizione/email/push.
4. Contatti di emergenza: layout riallineato, summary card, cards più pulite; eliminata la grande barra blu inferiore.
5. Lingue: selezione immediata in Impostazioni con English, Italiano, Español, Français, Deutsch e Português. Alla prima installazione viene usata, se supportata, la lingua del dispositivo.
6. Backend: incluso `app.set('trust proxy', 1)` per Render, così `express-rate-limit` lavora correttamente dietro il proxy.

## Aggiornamento sicuro dalla 3.0

Non copiare segreti nel pacchetto. Prima di sostituire la cartella, conserva il tuo `.env.production` esistente e poi copialo nella root di questa versione.

Esempio:

```bash
cd "/Users/luca/Desktop/PROGETTI/WALLA SAFE BUTTON/Wallaa_Safe_Button_Ultra_v3_1"
npm install
npm run build
npx cap add ios        # solo se la cartella ios non esiste
npm run cap:sync
npm run ios:open
```

Se hai già una cartella `ios` funzionante nella 3.0, puoi copiarla nella 3.1 prima di `npm run cap:sync`, così mantieni AppIcon/Splash e configurazioni Xcode.

In Xcode verifica sempre:
- Bundle ID `it.wallaa.safebutton`
- Push Notifications
- Background Modes: Remote notifications, Uses Bluetooth LE accessories, Location updates
- privacy strings Camera/Bluetooth/Location
- nuovo Build number prima di Archive/TestFlight
