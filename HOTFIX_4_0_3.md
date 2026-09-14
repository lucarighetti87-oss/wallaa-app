# Wallaa v4.0.3 — Hotfix iPhone

Questa versione corregge due problemi riscontrati su iPhone reale nella v4.0.2:

1. **Nuovo guardiano / modifica contatto**: il bottom sheet ora segue il visual viewport iOS e non resta dietro alla tastiera. Il campo attivo viene portato in vista e il contenuto del form è scrollabile.
2. **SOS Press & Hold**: il countdown 3 → 2 → 1 non dipende più da `requestAnimationFrame`; usa timer assoluti ed è quindi più robusto in WKWebView. Il rilascio del dito prima di 3 secondi annulla l'attivazione.

## Aggiornamento sul Mac

1. Decomprimi la v4.0.3 in una nuova cartella.
2. Copia dalla cartella v4.0.2 il tuo file `.env.production` nella root della v4.0.3.
3. Apri Terminale nella nuova cartella ed esegui:

```bash
npm install
npm run build
npm run cap:sync
npm run ios:open
```

4. In Xcode seleziona il tuo iPhone e premi Run.

Non è necessario aggiornare GitHub/Render/PostgreSQL per questo hotfix: il backend non è stato modificato.
