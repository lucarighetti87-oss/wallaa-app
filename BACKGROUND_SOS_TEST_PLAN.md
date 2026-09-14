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
10. Test separato force-quit manuale (swipe via dal selettore): documentare il comportamento come limite iOS, non come normale scenario background.

Per ogni SOS verificare:
- ricezione email/push Guardian;
- alert in centrale;
- posizione iniziale;
- live location se prevista dal piano;
- nessun doppio alert per lo stesso packet id.
