# Wallaa 4.0.29 — AAA cinematic visual pass

Questa release modifica il progetto Wallaa Safety esistente. Le immagini Audit/1/2/3/4 sono state usate esclusivamente come riferimenti visivi e non vengono mostrate o rigenerate nell'app.

## Linguaggio visivo applicato
- dark futuristic più profondo;
- pannelli glass con sweep speculare;
- neon ciano e blu con bloom controllato;
- rosso emergenza più vivo durante SOS;
- maggiore profondità su device, mappe e card;
- entrate progressive delle card;
- feedback fisico/visivo sui pulsanti;
- transizioni di schermata brevi e cinematografiche.

## Animazioni implementate
### Home
- SOS: pulsazione core, radar multipli, glow dinamico;
- Wallaa Button: floating lento + sweep speculare + W luminosa quando connesso;
- card: ingresso progressivo e risposta alla pressione;
- header: light-scan discreto; logo con respiro luminoso.

### Pairing
- onde scanner intorno al dispositivo;
- check progressivi con conferma pop;
- CTA con sweep energetico;
- feedback di connessione senza toccare la logica BLE.

### Guardian Mode
- mappa reale OpenStreetMap mantenuta;
- overlay dark cinematografico;
- percorso con flusso luminoso continuo;
- nodi pulsanti;
- pin live con ping radar;
- etichette utente/Guardian con micro-movimento;
- indicatore LIVE pulsante.

### SOS attivo
- beacon rosso vivo;
- radar emergenza;
- timeline che entra in sequenza;
- indicatori centrale/contatti/posizione con pulse dedicati;
- timer reale invariato.

### Allarme risolto
- shield con anelli di conferma;
- glow calmo sul messaggio "Sei al sicuro";
- righe di conferma progressive;
- stato sincronizzato invariato.

## Transizioni
Home -> funzione: fade/translate/blur molto breve (~420 ms).
SOS: attivazione mantiene la logica esistente e passa alla schermata emergenza senza introdurre attese.
Chiusura centrale -> resolved: schermata di conferma con animazioni calmanti.

## Accessibilità
Con `prefers-reduced-motion: reduce` tutte le animazioni decorative vengono disabilitate.
