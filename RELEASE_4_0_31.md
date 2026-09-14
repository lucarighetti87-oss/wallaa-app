# Wallaa 4.0.31 — Build 34

Fixes mirati:

- Home compattata: eliminato lo spazio verticale eccessivo tra top bar e blocco PERSONAL SAFETY ECOSYSTEM.
- Hero ridotta mantenendo radar/globo e gerarchia grafica premium.
- SOS protetto da selezione testo/callout iOS: nessuna lente, selezione o ricerca testuale durante il press-and-hold.
- `touch-action:none`, `user-select:none`, `-webkit-touch-callout:none` e figli non-interattivi sul bottone SOS.
- `patch-native.mjs` aggiornato per non riportare più Xcode a versioni/build vecchie dopo `npm run cap:sync`.
