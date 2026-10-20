import {test,expect} from '@playwright/test';
test('Sentinel markers appear when GPS arrives after opening the map',async({page})=>{
 await page.goto('/tests/ui/index.html?screen=map&delayedLocation');
 await expect(page.locator('.v412-real-map.empty')).toBeVisible();
 await page.getByRole('button',{name:'Fornisci posizione di prova'}).click();
 await expect(page.getByRole('img',{name:'Copertura Sentinel elevata'})).toBeVisible();
 await expect(page.locator('.edge-marker')).toHaveCount(4,{timeout:5000});
});
test('normalized private Sentinel bearings occupy four distinct map edges',async({page},testInfo)=>{await page.goto('/tests/ui/index.html?screen=map');const map=page.locator('.v412-real-map');await expect(page.locator('.edge-marker')).toHaveCount(4);const rect=await map.boundingBox();for(const [name,direction] of [['Nord','top'],['Est','right'],['Sud','bottom'],['Ovest','left']]){const marker=page.getByRole('button',{name:`1 Sentinel disponibile · ${name}`,exact:true});const box=await marker.boundingBox();if(direction==='top')expect(box.y).toBeLessThan(rect.y+60);if(direction==='right')expect(box.x).toBeGreaterThan(rect.x+rect.width-70);if(direction==='bottom')expect(box.y).toBeGreaterThan(rect.y+rect.height-70);if(direction==='left')expect(box.x).toBeLessThan(rect.x+60);}await page.getByRole('button',{name:'1 Sentinel disponibile · Nord',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Direzione: Nord');await page.screenshot({path:testInfo.outputPath('sentinel-directions.png')});});

test('last-known Sentinel indicators remain visible without being presented as available',async({page},testInfo)=>{
 await page.goto('/tests/ui/index.html?screen=map&staleSentinels=1');
 await expect(page.locator('.state-stale')).toHaveCount(2);await expect(page.locator('.edge-marker')).toHaveCount(4);
 await expect(page.locator('.sentinel-network-meter')).toBeVisible();await expect(page.locator('.sentinel-network-meter')).not.toContainText(/disponibili|abilitate|senza posizione|offline|intervento/);
 await page.getByRole('button',{name:'1 Sentinel da aggiornare · Nord',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('Ultimo riferimento noto: disponibilità da confermare.');
 await page.screenshot({path:testInfo.outputPath('sentinel-stale-reference.png')});
});

test('network meter contains no counts, reflects service level, and pauses offscreen or with reduced motion',async({page},testInfo)=>{
 await page.goto('/tests/ui/index.html?screen=meter-preview&level=4');
 const card=page.locator('.sentinel-network-meter');await expect(card).toHaveClass(/is-animating/);await expect(card).toHaveText('Rete Sentinel');
 await expect(card.getByRole('img',{name:'Copertura Sentinel elevata'})).toBeVisible();
 await page.screenshot({path:testInfo.outputPath('network-green.png')});
 await page.emulateMedia({reducedMotion:'reduce'});await expect(card.locator('.sentinel-network-lens i')).toHaveCSS('animation-name','none');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{document.querySelector('.sentinel-network-meter').style.marginTop='200vh';});await expect(card).not.toHaveClass(/is-animating/);
 await page.goto('/tests/ui/index.html?screen=meter-preview&level=0');await expect(page.getByRole('img',{name:'Copertura Sentinel limitata'})).toBeVisible();
 await page.goto('/tests/ui/index.html?screen=meter-preview&unknown');await expect(page.locator('.sentinel-network-meter')).toHaveClass(/is-unknown/);await expect(page.locator('.sentinel-network-lens')).toHaveCount(0);
});
