# Wallaa 4.0.138 — click SOS e presenza Sentinel

Nel menu WB-001 si può scegliere un click immediato o due click entro due secondi. La scelta resta salvata durante avvio, riconnessione e nuova configurazione. Il canale autenticato AA08 gestisce le pressioni sia in primo piano sia in background; gli annunci radio MOKO non avviano un secondo SOS. In modalità doppia il primo click viene riconosciuto e azzerato sul dispositivo senza inviare SOS. La conferma dell’abbinamento e la risincronizzazione restano escluse. Nessun reset della finestra al semplice ACK; reset a disconnessione, sincronizzazione e cambi di account/pulsante/modalità/protezione.

La schermata visibile recupera una posizione a precisione moderata dopo avere verificato che l’account sia Sentinel disponibile. Tentativi al massimo ogni due minuti, cache di un minuto, nessuna richiesta per account ordinari/offline. Il servizio iOS resta responsabile del background. Nessun meccanismo può garantire aggiornamenti quando iOS impedisce l’esecuzione o l’utente nega i permessi.

Admin 1.9.26 distingue ultimo heartbeat e ultima posizione; non rende recente una coordinata vecchia e non forza la reperibilità. Righe mobili separate per nome, stato e date.

Verifica: 81 test app, 21 test WebKit dispositivo, harness Swift della selezione uno/due click, harness nativi MOKO/presenza/energia/configurazione. Archivio Release iOS firmato generato con successo. Nessun iPhone disponibile per una prova fisica; nessun SOS reale inviato. Consumo e temporizzazione del firmware su pulsante fisico restano da misurare.

Distribuzione TestFlight: caricamento bloccato dal controllo automatico delle autorizzazioni in attesa di consenso specifico per build 138. Nessun invio App Review.
