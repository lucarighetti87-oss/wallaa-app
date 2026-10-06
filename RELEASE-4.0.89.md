# Wallaa 4.0.89 — build 89

Corregge l'avvio bloccato sulla schermata vuota della build 88. Nel simulatore Release, la finestra creata dallo storyboard conteneva un UIViewController generico, quindi il bridge Capacitor e l'interfaccia web non venivano caricati. La semplice presenza di window impediva al precedente fallback di intervenire.

SceneDelegate crea ora esplicitamente la finestra con WallaaBridgeViewController. Rimossi i riferimenti allo storyboard della schermata principale dalla configurazione di avvio; lo storyboard di lancio resta presente. Nessuna cancellazione dei dati, delle preferenze o della sessione dell'utente.

Verifica: problema riprodotto prima della modifica; dopo la modifica la build Release nel simulatore iPhone 17 Pro/iOS 26.5 mostra la schermata di accesso. Ripetuto l'avvio a freddo e verificato il controller della finestra. I 15 test del rilascio passano. Archivio firmato riuscito; plist incorporato verificato come versione 4.0.89/build 89, senza riferimenti allo storyboard della schermata principale.

Il simulatore non verifica Bluetooth o il recupero della sessione specifica del telefono. La conferma finale sull'iPhone richiede l'aggiornamento TestFlight alla build 89.
