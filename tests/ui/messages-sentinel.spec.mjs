import {test,expect} from '@playwright/test';

for(const theme of ['light','dark'])test(`message names and search stay readable above a resized keyboard viewport (${theme})`,async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`/tests/ui/index.html?theme=${theme}`);
 await expect(page.getByText('Marta Test')).toBeVisible();
 expect(await page.locator('.wallaa-conversation-copy strong').evaluate(node=>getComputedStyle(node).color)).toBe('rgb(237, 247, 255)');
 await page.getByRole('button',{name:'Cerca un utente Wallaa',exact:true}).click();
 await page.setViewportSize({width:390,height:410});
 await page.getByPlaceholder('Nome, email o numero').fill('More');
 await expect(page.getByText('More Test')).toBeVisible();
 const avatar=await page.locator('.wallaa-message-user-result .wallaa-conversation-avatar').boundingBox();
 const name=await page.getByText('More Test').boundingBox();
 const email=await page.getByText('more@example.invalid').boundingBox();
 expect(avatar.x+avatar.width).toBeLessThanOrEqual(name.x);
 expect(email.y).toBeGreaterThan(name.y);
 const dialog=page.getByRole('dialog',{name:'Nuova conversazione'});
 expect(await dialog.evaluate(node=>node.parentElement.parentElement===document.body)).toBe(true);
 for(const locator of [page.getByPlaceholder('Nome, email o numero'),page.getByText('More Test')]){
  const rect=await locator.boundingBox();expect(rect.y).toBeGreaterThanOrEqual(0);expect(rect.y+rect.height).toBeLessThanOrEqual(410);
 }
 expect(await dialog.locator('h2').evaluate(node=>getComputedStyle(node).color)).toBe('rgb(237, 247, 255)');
 await page.screenshot({path:testInfo.outputPath(`messages-${theme}-keyboard.png`)});
 await page.getByRole('button',{name:'Chiudi',exact:true}).click();
 await expect(dialog).toHaveCount(0);expect(errors).toEqual([]);
});
test('an expired pushed offer remains readable through a server refresh',async({page},testInfo)=>{
 await page.goto('/tests/ui/index.html?screen=sentinel&mode=expired');
 await expect(page.getByText('Il tempo per rispondere è terminato.',{exact:false})).toBeVisible();
 await page.waitForTimeout(5500);
 await expect(page.locator('.sentinel-offer')).toBeVisible();
 await expect(page.getByRole('button',{name:'Accetta',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Chiudi richiesta'}).click();
 await expect(page.locator('.sentinel-offer')).toHaveCount(0);
});
test('a live request has a countdown and keeps a readable explanation after expiry',async({page},testInfo)=>{
 await page.goto('/tests/ui/index.html?screen=sentinel&mode=expires');
 await expect(page.getByRole('button',{name:'Accetta',exact:true})).toBeEnabled();
 await expect(page.getByText('Tempo per rispondere:',{exact:false})).toBeVisible();
 await expect(page.getByText('Il tempo per rispondere è terminato.',{exact:false})).toBeVisible({timeout:5000});
 await expect(page.locator('.sentinel-offer')).toBeVisible();
});
test('a closed SOS explains why acceptance is unavailable',async({page},testInfo)=>{
 await page.goto('/tests/ui/index.html?screen=sentinel&mode=closed');
 await expect(page.getByText('La persona ha chiuso l’SOS.',{exact:false})).toBeVisible();
 await expect(page.getByRole('button',{name:'Accetta',exact:true})).toHaveCount(0);
});

test('a slow previous search cannot replace the latest recipient results',async({page})=>{
 await page.goto('/tests/ui/index.html?race=1');
 await page.getByRole('button',{name:'Cerca un utente Wallaa',exact:true}).click();
 const input=page.getByPlaceholder('Nome, email o numero');
 await input.fill('More');await page.waitForTimeout(350);await input.fill('Marta');
 await expect(page.getByText('Marta Latest')).toBeVisible();
 await page.waitForTimeout(500);
 await expect(page.getByText('Marta Latest')).toBeVisible();
 await expect(page.getByText('More Test')).toHaveCount(0);
});
