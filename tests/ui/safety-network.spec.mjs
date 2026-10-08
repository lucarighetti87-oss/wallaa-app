import {test,expect} from '@playwright/test';
test('one safety list merges the QR relationship and opens people and a discreet QR',async({page})=>{
 await page.goto('/tests/ui/index.html?screen=network');
 await expect(page.getByRole('heading',{name:'Rete di Sicurezza',exact:true})).toBeVisible();
 await expect(page.locator('.safety-person')).toHaveCount(3);
 await expect(page.getByText('Marta Rossi',{exact:true})).toHaveCount(1);
 await page.getByRole('button',{name:'Il mio QR',exact:true}).click();await expect(page.locator('.safety-qr-panel img')).toBeVisible();
 await page.getByRole('button',{name:/Marta Rossi/}).click();await expect(page.getByRole('status')).toHaveText('Marta Rossi');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);expect(overflow).toBe(false);
 await page.locator('.app-main-v4').evaluate(el=>el.scrollTop=0);
 await page.screenshot({path:'artifacts/safety-network-mobile.png',fullPage:true});
});
test('English and incoming-only details are readable; no private permission editing',async({page})=>{
 await page.goto('/tests/ui/index.html?screen=network&language=en');
 await expect(page.getByRole('heading',{name:'Safety Network',exact:true})).toBeVisible();
 await page.getByRole('button',{name:/Elena Verdi/}).click();await expect(page.getByRole('region',{name:'Elena Verdi'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Stop receiving their SOS alerts'})).toBeVisible();
});
test('Sentinel sweep only appears with server-confirmed protection, and reduced motion is honored',async({page})=>{
 await page.goto('/tests/ui/index.html?screen=home');await expect(page.locator('.sentinel-mode-sweep')).toHaveCount(0);
 await page.goto('/tests/ui/index.html?screen=home&sentinel');await expect(page.locator('.sentinel-mode-sweep')).toHaveCount(1);
 await page.emulateMedia({reducedMotion:'reduce'});expect(await page.locator('.sentinel-mode-sweep').evaluate(el=>getComputedStyle(el,'::before').animationName)).toBe('none');
 await page.screenshot({path:'artifacts/sentinel-home-mobile.png',fullPage:true});
});
