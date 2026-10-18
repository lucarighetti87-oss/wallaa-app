import {test,expect} from '@playwright/test';
test('Aiuto is reachable from the dropdown menu and closes it',async({page})=>{
 await page.goto('/tests/ui/index.html?screen=menu');await page.getByRole('button',{name:'Aiuto',exact:true}).click();expect(await page.evaluate(()=>window.menuTarget)).toBe('help');expect(await page.evaluate(()=>window.menuClosed)).toBe(true);
});
test('help explains the actual logos and opens searchable illustrated function cards',async({page},testInfo)=>{
 await page.goto('/tests/ui/index.html?screen=help');await expect(page.getByRole('heading',{name:'Aiuto',exact:true})).toBeVisible();await expect(page.getByRole('img',{name:'Logo Wallaa'})).toBeVisible();await expect(page.getByRole('img',{name:'Logo Sentinel'})).toBeVisible();
 await page.getByLabel('Cerca nella guida').fill('Guardian Pro');await page.locator('details').filter({has:page.locator('strong',{hasText:/^Guardian Pro$/})}).locator('summary').click();await expect(page.locator('details[open]')).toContainText('non coincide con l’abbonamento Wallaa Pro');
 await page.getByLabel('Cerca nella guida').fill('due click');const topic=page.locator('details').filter({has:page.locator('strong',{hasText:'Un click o due click'})});await topic.locator('summary').click();await expect(topic).toContainText('due volte entro due secondi');await topic.getByRole('button',{name:'Apri la funzione'}).click();expect(await page.evaluate(()=>window.helpTarget)).toBe('device');
 await page.getByLabel('Cerca nella guida').fill('xyznonexistent');await expect(page.getByText(/Nessun argomento trovato/)).toBeVisible();
 await page.getByLabel('Cerca nella guida').fill('');await page.screenshot({path:testInfo.outputPath('help-mobile.png'),fullPage:true});
});
test('help stays readable at narrow width and the logos explain availability without implying an alarm',async({page})=>{
 await page.setViewportSize({width:320,height:740});await page.goto('/tests/ui/index.html?screen=help');await expect(page.locator('.help-logos')).toContainText('non significa che sia partito un SOS');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.getByLabel('Cerca nella guida').fill('Sentinel');const topic=page.locator('details').filter({has:page.locator('strong',{hasText:/^Sentinel$/})});await topic.locator('summary').click();await expect(topic).toContainText('posizione Sempre');await expect(topic).toContainText('non significa intervento già accettato');
});
