# Wallaa — Test finale SOS hardware in background

Eseguire tutti i test con lo stesso iPhone e lo stesso Wallaa Button già associato.

1. App aperta in Home -> gesto configurato -> SOS deve arrivare.
2. Tornare alla Home di iOS senza chiudere Wallaa -> attendere 30 secondi -> SOS.
3. App in background 5 minuti -> SOS.
4. App in background 15 minuti -> SOS.
5. Schermo iPhone bloccato 5 minuti -> SOS.
6. Schermo iPhone bloccato 15 minuti -> SOS.
7. Ripetere due SOS separati di 5-10 secondi mentre l'app resta in background, chiudendo il primo alert tra i due.
8. Disattivare e riattivare Bluetooth dal Control Center, verificare che Wallaa torni operativo e testare SOS.
9. Riavviare iPhone, sbloccarlo almeno una volta, aprire Wallaa una volta e poi metterla in background -> SOS.
10. Chiusura manuale dal selettore (force quit): su iOS 26 verificare prima l’autorizzazione WB-001 in AccessorySetupKit, poi chiudere, attendere e premere una volta. Registrare separatamente riavvio del processo, evento hardware e consegna reale SOS. Su versioni precedenti documentare i limiti di ripristino Apple.
11. Riapertura senza premere il pulsante: nessun nuovo SOS. Ripetizioni del conteggio positivo già ricevuto devono restare duplicate; dopo conferma hardware e AA08 zero, un nuovo singolo click deve generare un nuovo evento.

Per ogni SOS verificare:
- ricezione email/push Guardian;
- alert in centrale;
- posizione iniziale;
- live location se prevista dal piano;
- nessun doppio alert per lo stesso packet id.

Riferimenti ufficiali:
- [Apple TN3115, nota 5 (iOS 26 / AccessorySetupKit)](https://developer.apple.com/documentation/technotes/tn3115-bluetooth-state-restoration-app-relaunch-rules)
- [SDK MOKO: comando dismiss EA014100](https://github.com/BeaconX-Pro/14-iOS-MKButton-SDK/blob/47a998e95ade5814ceab925d95c18d187e196de8/MKBeaconXDButton/Classes/SDK/BXD/MKBXDInterface%2BMKBXDConfig.m)
