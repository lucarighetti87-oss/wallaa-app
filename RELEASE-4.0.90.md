# Wallaa 4.0.90 — build 90

Corregge il contrasto dei nomi e dei titoli nella schermata Messaggi, nei temi chiaro e scuro. La ricerca di una nuova conversazione viene mostrata fuori dai contenitori animati della pagina e resta entro lo spazio visibile sopra la tastiera. I risultati hanno avatar, nome e recapito separati; risposte lente a ricerche precedenti non sostituiscono il destinatario cercato più recentemente.

La richiesta Sentinel mostra il tempo restante, verifica lo stato sul server e conserva una spiegazione leggibile quando scade, viene assegnata o l'SOS viene chiuso. Il pulsante Accetta non è disponibile prima della verifica o dopo la scadenza. Le risposte di aggiornamenti precedenti non sovrascrivono l'esito di un'accettazione/rifiuto. Il callback di chiusura è stabile e non riavvia il polling a ogni aggiornamento dell'orologio.

Richiede backend 4.0.53 per la lettura dello stato di una richiesta specifica. Il server concede inizialmente 60 secondi per rispondere, al posto di 10.

Verifiche: 19 test app e 6 prove WebKit sui componenti reali con rete simulata, inclusi due temi, viewport ridotto per la tastiera, ricerca fuori ordine, scadenza e SOS chiuso. Le prove non hanno inviato messaggi o SOS reali. Il viewport ridotto verifica il layout WebKit; l'animazione della tastiera nativa sul telefono resta da confermare dopo l'aggiornamento.
