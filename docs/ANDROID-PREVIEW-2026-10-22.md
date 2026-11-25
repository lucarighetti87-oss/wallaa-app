# Wallaa Android — anteprima 1

22 ottobre 2026. Pacchetto `it.wallaa.safebutton`, versione 4.0.145, codice Android 1. Android minimo 8 (API 26); target API 36. Firma di debug, non firma di pubblicazione Google Play.

## Stato effettivo

APK compilato e firma verificata. Non pubblicato su Google Play. Nessun Android fisico disponibile: Luca organizzerà il collaudo con un’altra persona. Nessun invio SOS reale eseguito. Il backend Android è preparato localmente e non è stato rilasciato; il backend iPhone 4.0.89 e TestFlight 145 restano il rilascio esistente.

File aggiornato: `../artifacts/android/Wallaa-Android-preview-1-firebase.apk` (circa 79 MB).
SHA-256: `befa8eee5089f7320f71a1b7b1d1d909b9c28be6bb3f6f7b8e696c8686b19753`.

## Preparato

- Progetto Android Capacitor e strumenti di compilazione, con licenza SDK autorizzata da Luca.
- Interfaccia condivisa Wallaa, testi adattati al telefono Android e apertura Google Maps.
- Collegamento nativo WB-001: autenticazione, verifica identità hardware, sincronizzazione contatore prima di accettare pressioni, riconnessione con attese crescenti.
- Password del pulsante cifrata con Android Keystore. Backup/trasferimento dei dati privati disabilitati.
- Pressione singola o doppia entro 2 secondi; raffiche di pressioni gestite come evento valido dopo la soglia. Deduplicazione di un SOS già attivo/in invio.
- Servizio Android visibile per collegamento e posizione; posizione ordinaria a consumo ridotto, GPS più preciso durante richiesta/intervento/emergenza. Nessuna promessa di consumo reale senza misurazione.
- Predisposizione FCM nel telefono e nel backend, mantenendo separato il percorso APNs iPhone. Configurazione Firebase client integrata; credenziale server creata e validata con Google senza invio reale. Segreto FCM salvato su Render il 25 novembre 2026. Restano rilascio backend e prova consegna reale.
- Nessuna pressione o allerta simulata viene spacciata per prova hardware.

## Verifiche concluse

- 87 test JavaScript: passati.
- 90 test interfaccia WebKit: passati; non costituiscono un test Android fisico.
- 4 test Java del protocollo e della doppia pressione: passati.
- 96 test backend: passati, inclusi routing Android e rispetto dei permessi di posizione.
- Compilazione `assembleDebug`, test nativi e `lintDebug`: riusciti. Nessun errore lint; rimangono avvisi non bloccanti, tra cui dipendenze/versioni e risorse del progetto.
- Firma APK verificata, package/minSdk/targetSdk controllati.

## Mancanze che impediscono il lancio

1. Rilasciare il backend Android; la credenziale FCM è salvata su Render. Progetto Firebase e configurazione client sono presenti; autenticazione e permesso di invio validati con Google (validate_only). Nessuna consegna reale ancora provata.
2. Account Google Play organizzazione creato, pagamento comunicato dal titolare e console accessibile. Il documento precedente è stato rifiutato e il titolare ha inviato un nuovo documento il 25 novembre 2026: verifica Google in corso. Dichiarazione commerciante salvata con consenso esplicito. Restano verifica sito e telefoni, scheda app e dichiarazioni su dati/localizzazione/servizio in primo piano.
3. Chiave di upload e configurazione firma di produzione, pacchetto AAB di rilascio.
4. Collaudo su Android reale con WB-001, inclusi blocco schermo, restrizioni del produttore, recupero dopo perdita di connessione e consumi.
5. Parità ancora da completare e collaudare: Health Check basato sul movimento in background, promemoria/escalation Connection Guard nativi, rilevamenti comunitari dei pulsanti in background. Non considerarli già equivalenti a iOS.
6. Acquisto digitale Pro: Google Play Billing non implementato. Non vendere il Pro in Android usando la procedura Apple. Nessun compenso Sentinel integrato.

Lo script `android:check-release` controlla alcuni prerequisiti locali; non certifica da solo funzionalità complete, approvazione Google o collaudo superato.

## Azioni account di Luca

- Attendere la verifica Google dei documenti caricati per ARABELL GROUP SRL e completare sito/telefoni. Console: https://play.google.com/console/u/4/developers/5772502287566660300/home .
- Firebase `wallaa-safety` creato sul piano Spark gratuito. App `it.wallaa.safebutton` registrata e configurazione locale integrata, esclusa dal repository.
- La credenziale server Firebase va conservata come segreto del backend (`FIREBASE_SERVICE_ACCOUNT_JSON`), mai in chat, APK o Git. Configurazione e rilascio vanno verificati prima di testare la consegna.
- Organizzare un collaudatore con telefono Android e pulsante vicino. Non sono stati contattati terzi.

## Guida al collaudo con un’altra persona

### Prima sessione: verifica preliminare

Concordare una sessione, modello del telefono, versione Android e disponibilità del WB-001. L’APK è preliminare, non va usato come protezione personale. Prima di premere il pulsante predisporre un account di prova e un ambiente controllato con destinatari di prova: l’app usa servizi reali se configurata per produzione.

Installare l’APK solo sul telefono del collaudatore, autorizzando l’installazione da quella fonte se Android lo richiede. Aprire Wallaa e controllare avvio, registrazione/login e interfaccia. Concedere Bluetooth/dispositivi vicini e posizione quando richiesto; la posizione in background richiede la scelta nelle impostazioni Android. Verificare che un rifiuto dei permessi dia una spiegazione e non un blocco/crash.

Con l’ambiente di prova pronto: associare il pulsante, controllare che lo stato pronto arrivi solo dopo la verifica effettiva, scollegare/ricollegare, verificare revoca e nuova attivazione autorizzata dall’admin. Controllare separatamente connessione Bluetooth e proprietà sul server.

### Sessione completa dopo configurazione Firebase e funzioni mancanti

- Account e destinatari di prova: pressione singola, doppia, pressioni isolate distanti oltre 2 secondi, raffiche di 3/7 click; un solo SOS attivo per raffica e nessun SOS durante l’associazione.
- Notifiche: app aperta, in background, schermo bloccato; ricezione, suono/vibrazione secondo impostazioni Android, apertura del dettaglio e cronologia campanella. Verificare il rinnovo del token notifiche.
- Sentinel disponibile: telefono fermo e in movimento, schermata bloccata per almeno un’ora; controllare sul server data GPS reale, contatto, stato e visibilità. Poi richiesta/intervento controllati e ritorno a consumo ordinario.
- Pulsante vicino e poi realmente fuori portata: verificare riconnessione e, una volta implementata la parità Connection Guard, doppio controllo e sequenza avvisi richiesta da Luca.
- Batteria: annotare percentuale iniziale/finale, durata, schermo acceso/spento, rete, stato Sentinel e attività Wallaa. Confrontare periodi comparabili; nessuna percentuale di miglioramento dichiarata prima della misura.
- Riavvio, Bluetooth spento/riacceso, permessi revocati e arresto forzato: documentare il comportamento reale. Non promettere che Android consenta sempre risvegli o consegna push immediata.

Registrare per ogni prova risultato atteso, risultato reale, orario, modello/Android, versione APK e screenshot privi di dati sensibili. Eventuali test SOS vanno coordinati per evitare di allertare persone vere.
