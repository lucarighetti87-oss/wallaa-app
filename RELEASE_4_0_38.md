# Wallaa 4.0.38 — iOS layout & interaction stability pass

## Correzioni principali
- Hamburger menu: corretto il bug di stacking che trasformava il backdrop fixed in un elemento relativo, facendo comparire il menu fuori viewport.
- Drawer: ora resta fissato al viewport, rispetta la safe area iOS, blocca lo scroll sottostante e si chiude correttamente su navigazione/backdrop/Escape.
- Top bar Home: ripristinata safe area iOS per evitare sovrapposizione con ora, Dynamic Island e banner "torna a...".
- Notifiche: header riallineato, titolo e kicker separati correttamente, nessuna sovrapposizione con status bar.
- Notifiche: bottone "Cancella tutto" ridimensionato e stabilizzato sui display stretti.
- Notifiche: righe rese responsive con testi che vanno a capo senza invadere data/icone.
- Overlay critici: Modal, Incoming Alert, SOS Activation, Emergency Dispatch, Alert Result e Toast sono nuovamente fixed e sopra il contenuto.
- Viewport app: shell resa flex a 100dvh; main content con area scroll controllata e bottom dock stabile.
- Nessuna modifica alla logica SOS, BLE, Guardian Mode, account, backend o dati.

## Root cause corretto
Una regola CSS globale successiva (`.app-shell-v4 > *`) poteva sovrascrivere `position: fixed` dei layer diretti dell'app. Il SideMenu risultava quindi nel flusso del documento e appariva fuori schermo. La release 4.0.38 ripristina esplicitamente posizione e stacking dei layer critici alla fine della cascata CSS.

## Test aggiunto
`tests/v438-layout-stability.test.mjs`
- safe-area topbar
- drawer fixed + body scroll lock
- header notifiche responsive
- overlay critici fixed

## Versione
- App: 4.0.38
- Build: 41
