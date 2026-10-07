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
test('permission guide never claims Always granted for WhenInUse',async({page})=>{await page.goto('/tests/ui/index.html?screen=guide');await expect(page.getByText('La tua posizione non è pubblica.',{exact:false})).toBeVisible();await expect(page.getByText('solo durante un SOS attivo',{exact:false})).toBeVisible();await expect(page.getByRole('button',{name:'Attiva i permessi'})).toBeVisible();await expect(page.getByText('Protezione configurata',{exact:true})).toHaveCount(0);});
test('every notification opens readable details',async({page})=>{await page.goto('/tests/ui/index.html?screen=notifications');await page.getByRole('button',{name:'Apri notifica: WB-001 riconnesso'}).click();await expect(page.getByRole('dialog')).toContainText('Collegamento ripristinato');});
test('acknowledging an incoming SOS leaves an accessible active card',async({page})=>{await page.goto('/tests/ui/index.html?screen=incoming');await page.getByRole('button',{name:'Ho visto l’allarme'}).click();await expect(page.getByRole('button',{name:'SOS ancora attivo · Marta Test'})).toBeVisible();await page.getByRole('button',{name:'SOS ancora attivo · Marta Test'}).click();await expect(page.getByRole('alertdialog')).toBeVisible();});

test('operational chat and permission guide visual review',async({page},testInfo)=>{
 for(const screen of ['chat','central','guide','incoming']){await page.goto(`/tests/ui/index.html?screen=${screen}`);if(screen==='chat'||screen==='central'){await page.locator('textarea').fill('Sono qui, grazie.');await page.getByRole('button',{name:screen==='chat'?'Invia messaggio':'Invia',exact:true}).click();await expect(page.getByText('Sono qui, grazie.',{exact:true})).toBeVisible();}await page.screenshot({path:testInfo.outputPath(`${screen}.png`)});}
});
