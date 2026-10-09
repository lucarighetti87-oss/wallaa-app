import {test,expect} from '@playwright/test';
test('one safety list merges the QR relationship and opens people and a discreet QR',async({page})=>{
 await page.goto('/tests/ui/index.html?screen=network');
 await expect(page.getByRole('heading',{name:'Rete di Sicurezza',exact:true})).toBeVisible();
 await expect(page.locator('.safety-person')).toHaveCount(3);
 await expect(page.getByText('Marta Rossi',{exact:true})).toHaveCount(1);
 await expect(page.locator('.safety-cinematic-art')).toBeVisible();
 await page.waitForFunction(()=>document.querySelector('.safety-cinematic-art')?.naturalWidth>0);
 await expect(page.locator('.safety-person').last()).toHaveCSS('opacity','1');
 await page.screenshot({path:'artifacts/network-scene-build107.png'});
 await page.getByRole('button',{name:'Il mio QR',exact:true}).click();await expect(page.locator('.safety-qr-panel img')).toBeVisible();
 await page.getByRole('button',{name:/Marta Rossi/}).click();await expect(page.getByRole('heading',{name:'Scheda Guardian'})).toBeVisible();await expect(page.getByText('WSB-MARTA',{exact:true})).toBeVisible();await expect(page.locator('input')).toHaveCount(0);await expect(page.getByRole('status')).toHaveCount(0);await page.screenshot({path:'artifacts/guardian-details-build107.png'});await page.getByRole('button',{name:'Modifica',exact:true}).click();const editor=page.getByRole('dialog');await expect(editor).toBeVisible();await expect(editor.getByLabel('Codice cliente Wallaa',{exact:true})).toHaveValue('WSB-MARTA');await expect(editor.getByLabel('Email',{exact:true})).toHaveAttribute('readonly','');await expect(editor.getByLabel('Nome',{exact:true})).not.toBeFocused();await editor.getByRole('button',{name:'Indietro',exact:true}).click();await expect(editor).toHaveCount(0);await page.getByRole('button',{name:'Indietro',exact:true}).click();await expect(page.getByRole('heading',{name:'Rete di Sicurezza',exact:true})).toBeVisible();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);expect(overflow).toBe(false);
 await page.locator('.app-main-v4').evaluate(el=>el.scrollTop=0);
 await page.screenshot({path:'artifacts/safety-network-mobile.png',fullPage:true});
});
test('English and incoming-only details are readable; no private permission editing',async({page})=>{
 await page.goto('/tests/ui/index.html?screen=network&language=en');
 await expect(page.getByRole('heading',{name:'Safety Network',exact:true})).toBeVisible();
 await page.getByRole('button',{name:/Elena Verdi/}).click();await expect(page.getByRole('heading',{name:'Guardian details'})).toBeVisible();await expect(page.getByText('WSB-ELENA',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Edit',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Stop receiving their SOS alerts'})).toBeVisible();
});
test('Sentinel sweep matches the active Sentinel user logo, including Basic, and respects reduced motion',async({page})=>{
 await page.goto('/tests/ui/index.html?screen=home');await expect(page.locator('.sentinel-mode-sweep')).toHaveCount(0);
 await page.goto('/tests/ui/index.html?screen=home&sentinel&basic');await expect(page.locator('.sentinel-mode-sweep')).toHaveCount(1);await expect(page.locator('[data-wallaa-brand=sentinel]')).toHaveCount(1);
 await page.emulateMedia({reducedMotion:'reduce'});expect(await page.locator('.sentinel-mode-sweep').evaluate(el=>getComputedStyle(el,'::before').animationName)).toBe('none');
 await page.screenshot({path:'artifacts/sentinel-home-mobile.png',fullPage:true});
});

test('Sentinel glow covers the visible phone screen at the top and after scrolling',async({page})=>{
 await page.goto('/tests/ui/index.html?screen=home&sentinel&basic');
 const aura=page.locator('.sentinel-mode-sweep');await expect(aura).toHaveCount(1);
 const original=await aura.boundingBox();expect(original.height).toBeCloseTo(844,1);expect(original.y).toBeCloseTo(0,1);
 const before=await aura.evaluate(el=>getComputedStyle(el,'::before').transform);
 await page.waitForTimeout(1300);
 const after=await aura.evaluate(el=>getComputedStyle(el,'::before').transform);expect(after).not.toBe(before);
 await page.screenshot({path:'artifacts/sentinel-aura-top-build105.png'});
 await page.locator('.app-main-v4').evaluate(el=>{el.scrollTop=500;});expect(await page.locator('.app-main-v4').evaluate(el=>el.scrollTop)).toBeGreaterThan(0);const scrolled=await aura.boundingBox();expect(scrolled.y).toBeCloseTo(0,1);expect(scrolled.height).toBeCloseTo(844,1);
 await page.screenshot({path:'artifacts/sentinel-aura-scrolled-build105.png'});
});

test('the central Guardian light has an animated red pulse and respects reduced motion',async({page})=>{
 await page.goto('/tests/ui/index.html?screen=network');const energy=page.locator('.safety-central-energy');await expect(energy).toBeVisible();
 expect(await energy.evaluate(el=>getComputedStyle(el).animationName)).toBe('guardianRedPulse');
 expect(await energy.evaluate(el=>getComputedStyle(el,'::before').animationName)).toBe('guardianRedFlow');
 await page.emulateMedia({reducedMotion:'reduce'});expect(await energy.evaluate(el=>getComputedStyle(el).animationName)).toBe('none');expect(await energy.evaluate(el=>getComputedStyle(el,'::before').animationName)).toBe('none');
});

test('capture the Guardian lighting animation for review',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir:'artifacts/animation-capture',size:{width:390,height:844}}});
 const page=await context.newPage();await page.goto('http://127.0.0.1:5174/tests/ui/index.html?screen=network');
 await page.locator('.safety-scene-cinematic').scrollIntoViewIfNeeded();
 await page.waitForTimeout(6500);const video=page.video();await context.close();await video.saveAs('artifacts/guardian-animation-build107.webm');
});

test('Sentinel light is below the clickable Home content while remaining a moving background',async({page})=>{
 await page.goto('/tests/ui/index.html?screen=home&sentinel');const layer=page.locator('.sentinel-mode-sweep');expect(await layer.evaluate(el=>Number(getComputedStyle(el).zIndex))).toBeLessThan(await page.locator('.w37-scroll-content').evaluate(el=>Number(getComputedStyle(el).zIndex)));await page.locator('.w37-status-card').click();await page.screenshot({path:'artifacts/sentinel-below-cards-build111.png',fullPage:true});
});
