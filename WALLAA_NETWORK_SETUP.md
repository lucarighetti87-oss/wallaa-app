# Setup Rete Wallaa — QR + Push SOS

## 1. Database PostgreSQL su Render

Nel Dashboard Render crea un database PostgreSQL (New → PostgreSQL). Usa la regione più vicina al Web Service.

Dopo la creazione copia l'**Internal Database URL** e aggiungilo al Web Service `wallaa-safe-button-api` come:

```text
DATABASE_URL=<Internal Database URL>
PGSSL=false
```

Il server crea automaticamente le tabelle al riavvio. In `/health` devono risultare:

```json
"dbConfigured": true,
"databaseOnline": true
```

## 2. Chiave APNs Apple

Apri Apple Developer → Certificates, Identifiers & Profiles → Keys → +.

Crea una key con **Apple Push Notifications service (APNs)**. Scarica il file `.p8` una sola volta e conserva:

- Key ID → `APNS_KEY_ID`
- Team ID del Developer Account → `APNS_TEAM_ID`
- contenuto del file `.p8` → `APNS_PRIVATE_KEY`
- Bundle ID → `APNS_BUNDLE_ID=it.wallaa.safebutton`

Non mettere mai il `.p8` nel repository GitHub.

Su Render aggiungi le variabili:

```text
APNS_TEAM_ID=...
APNS_KEY_ID=...
APNS_BUNDLE_ID=it.wallaa.safebutton
APNS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
```

Dopo il deploy, `/health` deve mostrare:

```json
"apnsConfigured": true
```

## 3. Aggiorna backend GitHub

Sostituisci nel repository `wallaa-safe-button-api` almeno:

- `server.js`
- `package.json`
- `render.yaml`
- `.env.example`

Render farà il deploy automatico.

## 4. Xcode

Dopo la nuova build/sync:

```bash
npm install
npm run build
npm run cap:sync
npm run ios:open
```

In **TARGETS → App → Signing & Capabilities**:

- `+ Capability` → **Push Notifications**
- `+ Capability` → **Background Modes**
  - Remote notifications
  - Uses Bluetooth LE accessories
  - Location updates

Aumenta il numero Build prima di Archive/TestFlight.

## 5. Test reale con due iPhone

1. Installa la stessa nuova build TestFlight su iPhone A e B.
2. Su A imposta il nome "Delia" e apri **Rete**.
3. Su B apri **Rete → Scansiona QR** e inquadra il QR di Delia.
4. Su A verifica che B compaia in **Proteggono me**.
5. Su B verifica che Delia compaia in **Persone che proteggo**.
6. Su A premi TEST SOS oppure Wallaa Button.
7. Il backend invia email + push a B.
8. B riceve una notifica sonora; toccandola vede nome, posizione e pulsante Google Maps.

Per il test del push, autorizza le notifiche su entrambi gli iPhone.
