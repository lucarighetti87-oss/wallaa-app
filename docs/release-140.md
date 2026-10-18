# Wallaa 4.0.140 — rete Sentinel

Grafica approvata dall’utente il 18 ottobre 2026 dopo anteprima locale: sostituisce i conteggi sotto la mappa con barra cromatica, cursore luminoso, scia e orbita. Nessun numero o legenda visibile nel riquadro. Animazione sospesa fuori schermo e quando l’app è nascosta, rispettando Riduci movimento. Consultazione mappa ogni 30 secondi normalmente, 10 durante SOS; nessuna richiesta quando nascosta.

Il server 4.0.86 restituisce un livello qualitativo limitato da zero a quattro, calcolato sulle sole Sentinel verificate, disponibili, con contatto e posizione recenti entro il raggio configurato. Non conta registrazioni, utenti lontani o riferimenti scaduti. Se manca il dato o la richiesta fallisce, indicatore neutro.

All’attivazione Sentinel, una vecchia posizione rimasta nella schermata non viene inviata come presenza corrente: viene usata una cache recente oppure acquisita una posizione moderata. Spegnere Sentinel non avvia GPS. Un errore di posizione non annulla silenziosamente la disponibilità scelta. Il sistema non inventa coordinate mancanti né rende corrente una posizione vecchia. Le correzioni richiedono l’aggiornamento dell’app dei partecipanti.

Verifiche locali: 85 test app, 86 test server e tre test WebKit mappa/barra superati; build web e sincronizzazione iOS completate. Nessun SOS reale inviato. Prova fisica di background e misura del consumo ancora da eseguire.
