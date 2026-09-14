# Wallaa Personal Safety Ecosystem v4.0.4

## Novità

- **Parola d’ordine** in Impostazioni, mascherata di default e visualizzabile con il pulsante occhio.
- La parola d’ordine viene conservata nel profilo locale dell’app e inviata al backend solo quando viene generato un alert, per inserirla nelle istruzioni destinate ai guardiani. Non viene salvata nelle tabelle degli alert.
- Email di emergenza ridisegnata con **logo Wallaa incorporato**, gerarchia più professionale e istruzioni operative più chiare.
- Nuovo protocollo email: chiamare la persona senza anticipare la parola d’ordine; se la parola viene pronunciata, considerare la persona in pericolo e passare immediatamente al contatto dei soccorsi.
- Email di emergenza localizzata in IT / EN / ES / FR / DE / PT in base alla lingua del profilo.
- Nuova card **Suoni e feedback aptico** nelle Impostazioni con pulsante di prova dell’allarme guardiano.
- Attivazione SOS sul telefono della persona protetta volutamente **silenziosa + aptica**; il suono è riservato agli avvisi ricevuti dai guardiani.

## Backend richiesto

Questa release modifica anche `server/server.js`. Dopo aver installato l’app v4.0.4 è necessario aggiornare il repository GitHub/Render con il pacchetto backend v4.0.4 fornito separatamente.

## Verifiche eseguite

- Parsing JS/JSX: OK (42 file)
- `node --check server/server.js`: OK
- Test BTHome: 3/3 OK
- Core BLE/BTHome: non modificato
