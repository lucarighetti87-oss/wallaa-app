# Wallaa — configurazione necessaria per Email, QR e Rete

BLE, UI, preferenze e parte della geolocalizzazione possono funzionare anche senza backend. Email di emergenza, QR personale valido, Rete Wallaa, live tracking web e push richiedono invece un backend raggiungibile dall'iPhone.

## 1. Frontend iOS

Crea `.env.production` nella cartella principale:

```env
VITE_ALERT_API_URL=https://TUO-BACKEND/api/alert
VITE_API_BASE_URL=https://TUO-BACKEND
VITE_DEMO_MODE=false
```

Dopo ogni modifica a `.env.production` devi ricostruire e sincronizzare:

```bash
npm run build
npm run cap:sync
```

Poi riapri/esegui il progetto da Xcode.

## 2. Backend

Sul servizio backend configura almeno:

```env
APP_API_KEY (legacy, non usata come login utente)=UNA_CHIAVE_LUNGA_E_CASUALE
PUBLIC_BASE_URL=https://TUO-BACKEND
DATABASE_URL=postgresql://...
EMAIL_ENABLED=true
SMTP_HOST=...
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=Wallaa <...>
```

Per push TestFlight configura anche APNs (`APNS_TEAM_ID`, `APNS_KEY_ID`, `APNS_BUNDLE_ID=it.wallaa.safebutton`, `APNS_PRIVATE_KEY`).

## 3. Controllo dentro l'app

In v4.0.1 vai in **Impostazioni → Servizi Wallaa**.

Devono risultare verdi almeno:

- Backend
- Database — necessario per QR/Rete/Live Alert
- Email SMTP — necessario per invio email

APNs è necessario per le push fra utenti Wallaa.

Il pulsante **Invia email di test** verifica direttamente il server SMTP usando l'email del profilo.
