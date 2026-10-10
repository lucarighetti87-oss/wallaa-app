import {test,expect} from '@playwright/test';
test('Health Check requires explicit consent and offers all requested intervals',async({page})=>{
 await page.goto('/tests/ui/index.html?screen=health');
 const enable=page.getByRole('button',{name:'Attiva Health Check',exact:true});await expect(enable).toBeDisabled();
 await expect(page.locator('.health-duration select option')).toHaveText(['15 minuti','30 minuti','1 ora','2 ore']);
 await page.getByRole('checkbox').check();await enable.click();
 await expect(page.getByRole('button',{name:'Disattiva Health Check',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>window.healthAction.consentAccepted)).toBe(true);
 await page.screenshot({path:'artifacts/health-settings-build108.png',fullPage:true});
});
test('English pending check is readable and well closes it without an SOS',async({page})=>{
 await page.goto('/tests/ui/index.html?screen=health&mode=pending&language=en');
 await expect(page.getByRole('heading',{name:'Are you okay?'})).toBeVisible();
 await expect(page.getByText('Email to Guardian Pro contacts in')).toBeVisible();
 await page.screenshot({path:'artifacts/health-pending-build108.png',fullPage:true});
 await page.getByRole('button',{name:'Yes, I’m okay'}).click();
 expect(await page.evaluate(()=>window.healthAction.answer)).toBe('well');
 await expect(page.getByText('Movement detected: check closed.')).toBeVisible();
 await expect(page.getByText('mock SOS requested')).toHaveCount(0);
});
test('No asks for immediate help, with no accidental request while opening',async({page})=>{
 await page.goto('/tests/ui/index.html?screen=health&mode=pending');
 expect(await page.evaluate(()=>window.healthAction)).toBeUndefined();
 await page.getByRole('button',{name:'No, ho bisogno di aiuto'}).click();
 expect(await page.evaluate(()=>window.healthAction.answer)).toBe('help');
 await expect(page.getByText('mock SOS requested')).toBeVisible();
});
test('Basic cannot activate Health Check but can disable a previously enabled setting',async({page})=>{
 await page.goto('/tests/ui/index.html?screen=health&basic');
 await expect(page.getByRole('button',{name:'Attiva Health Check',exact:true})).toBeDisabled();
 await page.goto('/tests/ui/index.html?screen=health&basic&enabled');
 await page.getByRole('button',{name:'Disattiva Health Check',exact:true}).click();
 expect(await page.evaluate(()=>window.healthAction.enabled)).toBe(false);
});

test('Night Mode saves a user-selected overnight window, not a fixed duration',async({page})=>{
 await page.goto('/tests/ui/index.html?screen=health&enabled&language=en');
 await expect(page.getByRole('heading',{name:'Night Mode',exact:true})).toBeVisible();
 await page.getByRole('switch',{name:'Enable Night Mode'}).check();
 await page.getByLabel('Night Mode start',{exact:true}).fill('21:00');
 await page.getByLabel('Night Mode end',{exact:true}).fill('08:30');
 await page.getByRole('button',{name:'Save Night Mode'}).click();
 const saved=await page.evaluate(()=>window.healthAction);expect(saved.nightMode).toMatchObject({enabled:true,start:'21:00',end:'08:30'});expect(saved.enabled).toBeUndefined();
 await page.screenshot({path:'artifacts/health-night-build109.png',fullPage:true});
});
test('Night Mode rejects an ambiguous full-day window',async({page})=>{
 await page.goto('/tests/ui/index.html?screen=health&enabled');
 await page.getByRole('switch',{name:'Attiva Night Mode'}).check();
 await page.getByLabel('Fine Night Mode',{exact:true}).fill('23:00');
 await expect(page.getByRole('button',{name:'Salva Night Mode'})).toBeDisabled();
 await expect(page.getByRole('alert')).toContainText('devono essere diversi');
});

test('Health Check heading clears the iPhone status area and remains within the viewport',async({page})=>{await page.goto('/tests/ui/index.html?screen=health');const bounds=await page.locator('.health-heading').boundingBox();expect(bounds.y).toBeGreaterThanOrEqual(68);expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(390);await page.screenshot({path:'artifacts/health-safe-area-build110.png',fullPage:true});});

test('Night Mode time fields stay within the card on small iPhones and use the Wallaa switch',async({page})=>{
 for(const width of [320,390]){await page.setViewportSize({width,height:844});await page.goto('/tests/ui/index.html?screen=health&enabled');const card=page.locator('.health-night-card');await card.scrollIntoViewIfNeeded();const bounds=await card.boundingBox();const first=await page.getByLabel('Inizio Night Mode',{exact:true}).boundingBox();const last=await page.getByLabel('Fine Night Mode',{exact:true}).boundingBox();expect(first.x+first.width).toBeLessThanOrEqual(last.x);expect(last.x+last.width).toBeLessThanOrEqual(bounds.x+bounds.width-10);await expect(card.locator('.v4-switch')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);}
 await page.screenshot({path:'artifacts/health-night-aligned-build111.png',fullPage:true});
});

test('expired Guardian Pro notice stays visible even in Night Mode and needs an explicit well confirmation',async({page})=>{
 await page.goto('/tests/ui/index.html?screen=health&mode=email_sent&night&language=en');
 await expect(page.getByRole('heading',{name:'Are you okay?'})).toBeVisible();
 await expect(page.getByText('Expired',{exact:true})).toBeVisible();
 await expect(page.getByText('Email sent to Guardian Pro contacts',{exact:true})).toBeVisible();
 await page.screenshot({path:'artifacts/health-expired-receipt-build115.png',fullPage:true});
 await page.getByRole('button',{name:'Yes, I’m okay'}).click();
 expect(await page.evaluate(()=>window.healthAction.answer)).toBe('well');
 await expect(page.getByText('mock SOS requested')).toHaveCount(0);
});

test('Health Check history shows reminder and email counts in English',async({page})=>{
 await page.goto('/tests/ui/index.html?screen=health&history&language=en');
 await expect(page.getByRole('heading',{name:'Health Check history'})).toBeVisible();
 await expect(page.getByText('Emails sent to Guardian Pro contacts',{exact:true})).toBeVisible();
 await expect(page.getByText('Reminders: 3 · Emails sent: 2',{exact:true})).toBeVisible();
});

test('clear notifications removes Health Check records immediately and after reload without closing the Home check',async({page})=>{
 await page.goto('/tests/ui/index.html?screen=health-notifications');
 await expect(page.getByText('Wallaa Health Check',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Cancella tutto',exact:true}).click();
 await expect(page.getByText('Wallaa Health Check',{exact:true})).toHaveCount(0);
 await expect(page.getByText('Conferma Health Check ancora in Home',{exact:true})).toBeVisible();
 await page.reload();await expect(page.getByText('Wallaa Health Check',{exact:true})).toHaveCount(0);
});
