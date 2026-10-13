import { test, expect } from '@playwright/test';
test('Apple price, renewal terms and restore are visible without overflow on a small iPhone', async ({page}) => {
  await page.setViewportSize({width:320,height:700});
  await page.goto('/tests/ui/index.html?screen=apple-pro&language=en');
  await expect(page.getByText('€9.99')).toBeVisible();
  await expect(page.getByText(/Monthly subscription with automatic renewal/)).toBeVisible();
  const bounds=await page.locator('.apple-pro-purchase').boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x+bounds.width).toBeLessThanOrEqual(320);
  await page.getByRole('button',{name:'Restore purchases'}).click();
  await expect(page.getByRole('status')).toHaveText('No Apple purchases to restore for this account.');
});
test('disabled Apple setup never offers a purchase', async ({page}) => {
  await page.goto('/tests/ui/index.html?screen=apple-pro&disabled&language=en');
  await expect(page.getByRole('button',{name:'Activate Wallaa Pro'})).toHaveCount(0);
  await expect(page.getByText(/once setup is complete/)).toBeVisible();
});
test('pending Apple approval remains pending instead of reporting Pro activated', async ({page}) => {
  await page.goto('/tests/ui/index.html?screen=apple-pro&purchaseStatus=pending&language=en');
  await page.getByRole('button',{name:'Activate Wallaa Pro'}).click();
  await expect(page.getByRole('status')).toHaveText('Purchase awaiting Apple approval.');
});
test('payment verification failure offers recovery and keeps purchase enabled', async ({page}) => {
  await page.goto('/tests/ui/index.html?screen=apple-pro&paymentError&language=en');
  await page.getByRole('button',{name:'Activate Wallaa Pro'}).click();
  await expect(page.getByRole('status')).toHaveText(/Verification could not be completed/);
  await expect(page.getByRole('button',{name:'Restore purchases'})).toBeEnabled();
});
