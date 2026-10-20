import {test,expect} from '@playwright/test';

test('typing a safety word does not wait for network or save each character',async({page})=>{
 await page.goto('/tests/ui/index.html?screen=settings&slowSave');
 const card=page.locator('.v404-safety-word-card');
 const input=card.getByRole('textbox',{name:'Parola d’ordine'}).or(card.locator('input'));
 await input.pressSequentially('Ginocchio',{delay:10});
 await expect(input).toHaveValue('Ginocchio');
 expect(await page.evaluate(()=>window.profileSaveCalls||0)).toBe(0);
 await card.getByRole('button',{name:'Mostra parola d’ordine'}).click();
 await expect(input).toHaveValue('Ginocchio');
 await card.getByRole('button',{name:'Salva',exact:true}).click();
 await expect(card.getByRole('button',{name:'Salva',exact:true})).toBeDisabled();
 expect(await page.evaluate(()=>window.profileSaveCalls)).toBe(1);
 await page.evaluate(()=>window.finishProfileSave());
 await expect(input).toBeEnabled();
 await expect(input).toHaveValue('Ginocchio');
 await expect(card.getByRole('button',{name:'Salva',exact:true})).toBeDisabled();
});

test('a failed safety word save retains the draft for retry',async({page})=>{
 await page.goto('/tests/ui/index.html?screen=settings&slowSave');
 const card=page.locator('.v404-safety-word-card'),input=card.locator('input');
 await input.fill('Prova');
 await card.getByRole('button',{name:'Salva',exact:true}).click();
 await page.evaluate(()=>window.failProfileSave());
 await expect(card.getByRole('alert')).toContainText('Errore di prova');
 await expect(input).toHaveValue('Prova');
 await expect(card.getByRole('button',{name:'Salva',exact:true})).toBeEnabled();
});
