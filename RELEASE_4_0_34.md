# Wallaa 4.0.34 — Home visual rebuild locked to approved direction

## Obiettivo
Rifacimento della Home per avvicinarla il più possibile alla reference approvata:
interfaccia dark premium, glow neon blu, hero più scenografica, globo digitale,
pulsante SOS più impattante e card più coerenti con il look desiderato.

## Cosa è stato aggiornato
- Home `HomeV4Screen` rifinita per aderire alla composizione approvata.
- Hero con atmosfera più ricca, sweep luminoso e globo digitale dedicato.
- Card di stato, device e quick actions rese più premium con linee neon e profondità.
- Pulsante SOS migliorato con crosshair, glow, respiro visivo e comportamento non selezionabile.
- Rafforzata la percezione “futuristica / premium” senza usare l’immagine reference come asset.
- Mantenute tutte le funzionalità già presenti di navigazione e sicurezza.

## File principali toccati
- `src/screens/HomeV4Screen.jsx`
- `src/styles.css`
- `package.json`
- `ios/App/App.xcodeproj/project.pbxproj`
- `scripts/patch-native.mjs`

## Versioning
- Marketing version: 4.0.34
- Build: 37

## Nota
Questa release è focalizzata sul rifacimento grafico della Home in modo che il risultato
sia quasi uguale alla schermata approvata allegata dal cliente, mantenendo però una
implementazione UI nativa del progetto Wallaa.
