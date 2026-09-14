# Aggiornamento da v4.0.4 a v4.0.5

1. Aggiorna **prima il backend** GitHub/Render con `Wallaa_Backend_v4_0_5_GitHub_ROOT.zip`.
2. Attendi Render `Live` e verifica `/health`.
3. Decomprimi l'app v4.0.5.
4. Puoi copiare il vecchio `.env.production`, ma `VITE_ALERT_API_KEY` non è più usata dal codice v4.0.5.
5. Aggiungi/verifica nel `.env.production`:

```env
VITE_ALERT_API_URL=https://api.wallaa.it/api/alert
VITE_API_BASE_URL=https://api.wallaa.it
VITE_DEMO_MODE=false
VITE_PRIVACY_POLICY_URL=https://wallaasafety.com/privacy-policy
VITE_TERMS_URL=https://wallaasafety.com/terms-and-conditions
```

6. Esegui `npm install`, `npm run build`, `npm run cap:sync`, `npm run ios:open`.
7. In Xcode: Product → Clean Build Folder → iPhone reale → Run.

Gli utenti già configurati in v4.0.4 vengono migrati alla nuova tabella delle sessioni al primo accesso autenticato. Effettuando “Esci dall'account”, sarà possibile testare il nuovo login con email e password.
