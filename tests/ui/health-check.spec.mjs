import {test,expect} from '@playwright/test';
test('Health Check requires explicit consent and offers all requested intervals',async({page})=>{
 await page.goto('/tests/ui/index.html?screen=health');
 const enable=page.getByRole('button',{name:'Attiva Health Check',exact:true});await expect(enable).toBeDisabled();
 await expect(page.locator('select option')).toHaveText(['15 minuti','30 minuti','1 ora','2 ore']);
 await page.getByRole('checkbox').check();await enable.click();
 await expect(page.getByRole('button',{name:'Disattiva Health Check',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>window.healthAction.consentAccepted)).toBe(true);
 await page.screenshot({path:'artifacts/health-settings-build108.png',fullPage:true});
});
test('English pending check is readable and well closes it without an SOS',async({page})=>{
 await page.goto('/tests/ui/index.html?screen=health&mode=pending&language=en');
 await expect(page.getByRole('heading',{name:'Are you okay?'})).toBeVisible();
 await expect(page.getByText('Automatic SOS in')).toBeVisible();
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
