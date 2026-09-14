# Aggiornamento Wallaa v4.0.4

1. Copia il tuo `.env.production` dalla v4.0.3 nella cartella v4.0.4.
2. Nel Terminale entra nella cartella v4.0.4.
3. Verifica: `grep '"version"' package.json` → deve mostrare `4.0.4`.
4. Esegui: `npm install`
5. Esegui: `npm run build`
6. Esegui: `npm run cap:sync`
7. Esegui: `npm run ios:open`
8. In Xcode: Product → Clean Build Folder → seleziona iPhone → Run.
9. Aggiorna anche il backend GitHub/Render usando `Wallaa_Backend_v4_0_4_GitHub_ROOT.zip`.

Test consigliato:
- Impostazioni → Parola d’ordine → inserire una parola di prova.
- Impostazioni → Suoni e feedback aptico → Prova suono allarme guardiano.
- Inviare un SOS TEST e verificare che l’email contenga logo, parola d’ordine e nuovo protocollo operativo.
