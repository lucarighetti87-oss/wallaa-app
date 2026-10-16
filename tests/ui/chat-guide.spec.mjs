import {test,expect} from '@playwright/test';
for(const screen of ['chat','central']){
 test(`${screen} retains a failed draft and error through background refresh`,async({page})=>{
  await page.goto(`/tests/ui/index.html?screen=${screen}&sendError=1`);
  const input=page.locator('textarea');await input.fill('Ho bisogno di aiuto');
  await page.getByRole('button',{name:screen==='chat'?'Invia messaggio':'Invia',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Invio di prova non riuscito');await page.waitForTimeout(3300);
  await expect(input).toHaveValue('Ho bisogno di aiuto');await expect(page.getByRole('alert')).toContainText('Invio di prova non riuscito');
 });
 test(`${screen} successful send appears once and closed SOS is read-only`,async({page})=>{
  await page.goto(`/tests/ui/index.html?screen=${screen}`);await page.locator('textarea').fill('Sono qui');await page.getByRole('button',{name:screen==='chat'?'Invia messaggio':'Invia',exact:true}).click();
  await expect(page.getByText('Sono qui',{exact:true})).toHaveCount(1);await expect(page.locator('textarea')).toHaveValue('');await page.waitForTimeout(3300);await expect(page.getByText('Sono qui',{exact:true})).toHaveCount(1);
  await page.goto(`/tests/ui/index.html?screen=${screen}&mode=closed`);await expect(page.locator('textarea')).toHaveCount(0);
 });
}
test('permission guide never claims Always granted for WhenInUse',async({page})=>{await page.goto('/tests/ui/index.html?screen=guide');await expect(page.getByText('La tua posizione non è pubblica.',{exact:false})).toBeVisible();await expect(page.getByText('solo durante un SOS attivo',{exact:false})).toBeVisible();await expect(page.getByRole('button',{name:'Consenti posizione Sempre'})).toBeVisible();await expect(page.getByText('Protezione configurata',{exact:true})).toHaveCount(0);});
test('every notification opens readable details',async({page})=>{await page.goto('/tests/ui/index.html?screen=notifications');await page.getByRole('button',{name:'Apri notifica: WB-001 riconnesso'}).click();await expect(page.getByRole('dialog')).toContainText('Collegamento ripristinato');});
test('acknowledging an incoming SOS leaves an accessible active card',async({page})=>{await page.goto('/tests/ui/index.html?screen=incoming');await page.getByRole('button',{name:'Ho visto l’allarme'}).click();await expect(page.getByRole('button',{name:'SOS ancora attivo · Marta Test'})).toBeVisible();await page.getByRole('button',{name:'SOS ancora attivo · Marta Test'}).click();await expect(page.getByRole('alertdialog')).toBeVisible();});

test('operational chat and permission guide visual review',async({page},testInfo)=>{
 for(const screen of ['chat','central','guide','incoming']){await page.goto(`/tests/ui/index.html?screen=${screen}`);if(screen==='chat'||screen==='central'){await page.locator('textarea').fill('Sono qui, grazie.');await page.getByRole('button',{name:screen==='chat'?'Invia messaggio':'Invia',exact:true}).click();await expect(page.getByText('Sono qui, grazie.',{exact:true})).toBeVisible();}await page.screenshot({path:testInfo.outputPath(`${screen}.png`)});}
});

test('notification details stay in the viewport after scrolling a long transformed feed',async({page})=>{await page.goto('/tests/ui/index.html?screen=notifications&longNotifications');await page.locator('.aa-notification-row').last().click();const dialog=page.getByRole('dialog');await expect(dialog).toContainText('Cosa è successo');await expect(dialog).toContainText('Bluetooth');const box=await dialog.boundingBox();expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(844);expect(await dialog.evaluate(el=>el.closest('.screen-transition'))).toBeNull();await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);});
test('SOS notice explains source and time before opening the request; failed opening keeps details visible',async({page},testInfo)=>{await page.goto('/tests/ui/index.html?screen=notifications&ownSOS');await page.getByRole('button',{name:'Apri notifica: SOS inviato'}).click();const dialog=page.getByRole('dialog');await expect(dialog).toContainText('Comando del WB-001');await expect(dialog).toContainText('Pressione del pulsante');await expect(dialog).toContainText('2026');expect(await page.evaluate(()=>window.notificationOpened)).toBeUndefined();await page.screenshot({path:testInfo.outputPath('notification-sos-details.png')});await dialog.getByRole('button',{name:'Apri richiesta SOS'}).click();expect(await page.evaluate(()=>window.notificationOpened)).toBe('own-test');await page.goto('/tests/ui/index.html?screen=notifications&ownSOS&notificationError');await page.getByRole('button',{name:'Apri notifica: SOS inviato'}).click();await page.getByRole('button',{name:'Apri richiesta SOS'}).click();await expect(page.getByRole('dialog')).toContainText('Richiesta non disponibile');});

test('a newly arriving SOS dismisses notification details so the emergency is not covered',async({page})=>{await page.goto('/tests/ui/index.html?screen=notifications');await page.getByRole('button',{name:'Apri notifica: WB-001 riconnesso'}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.evaluate(()=>document.querySelector('[data-test-arrival]').click());await expect(page.getByRole('dialog')).toHaveCount(0);});

test('chat safety blocks sending, can unblock and submits a report without deleting the conversation',async({page},testInfo)=>{
 await page.goto('/tests/ui/index.html?screen=chat');
 await page.getByRole('button',{name:'Sicurezza della chat'}).click();
 const dialog=page.getByRole('dialog',{name:'Sicurezza della chat'});
 await dialog.getByRole('button',{name:'Blocca utente',exact:true}).click();
 await expect(dialog).toContainText('Utente bloccato nella chat.');
 await dialog.getByRole('button',{name:'Chiudi',exact:true}).click();
 await expect(page.locator('.wallaa-chat-composer textarea')).toBeDisabled();
 await page.getByRole('button',{name:'Sicurezza della chat'}).click();
 await dialog.getByRole('button',{name:'Sblocca utente',exact:true}).click();
 await dialog.locator('textarea').fill('Messaggi offensivi');
 await dialog.getByRole('button',{name:'Invia segnalazione'}).click();
 await expect(dialog).toContainText('Segnalazione ricevuta');
 expect(await page.evaluate(()=>window.chatReported.reason)).toBe('Messaggi offensivi');
 await page.screenshot({path:testInfo.outputPath('chat-safety.png')});
 await dialog.getByRole('button',{name:'Chiudi',exact:true}).click();
 await expect(page.locator('.wallaa-chat-composer textarea')).toBeEnabled();
});


test('permission actions do not block Continue and expose a stalled request',async({page})=>{
 await page.clock.install();await page.goto('/tests/ui/index.html?screen=guide&mode=stalled');
 await page.getByRole('button',{name:'Attiva posizione',exact:true}).click();await expect(page.getByRole('status')).toContainText('Richiesta in corso');await expect(page.getByRole('button',{name:'Continua per ora'})).toBeEnabled();
 await page.clock.fastForward(15001);await expect(page.getByRole('alert')).toContainText('La richiesta non si è conclusa');await expect(page.getByRole('button',{name:'Attiva posizione',exact:true})).toBeEnabled();
});
test('reinstall permissions have specific actions, keep missing grants visible and open Settings',async({page})=>{
 await page.goto('/tests/ui/index.html?screen=guide&mode=unchanged');await page.getByRole('button',{name:'Attiva posizione',exact:true}).click();expect(await page.evaluate(()=>window.requestedPermission)).toBe('location');await expect(page.getByRole('status')).toContainText('Se non compare');await expect(page.getByRole('button',{name:'Attiva posizione',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Impostazioni iPhone',exact:true}).click();expect(await page.evaluate(()=>window.settingsOpened)).toBe(true);await page.getByRole('button',{name:'Collega il pulsante',exact:true}).click();expect(await page.evaluate(()=>window.pairingOpened)).toBe(true);
});

test('security check offers an actual action for each unresolved item and never pretends backend recovery',async({page})=>{
 await page.clock.install();await page.goto('/tests/ui/index.html?screen=security-check');await page.clock.runFor(3000);
 await page.getByRole('button',{name:'Ricontrolla servizi'}).click();await expect(page.getByRole('alert')).toContainText('Servizi ancora non raggiungibili');await page.getByRole('button',{name:'Controlla i permessi'}).first().click();expect(await page.evaluate(()=>window.permissionsOpened)).toBe(true);await page.getByRole('button',{name:'Collega il pulsante'}).click();expect(await page.evaluate(()=>window.securityRoute)).toBe('device');
});
