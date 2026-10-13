import { Capacitor, registerPlugin } from '@capacitor/core';
import { CONFIG } from '../config';
import { confirmApplePurchase } from './applePurchaseFlow.mjs';

const Store = registerPlugin('WallaaStore');
export const applePurchasesSupported = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
async function request(identity, path, body) {
  const response = await fetch(`${CONFIG.apiBaseUrl}/api/billing/apple/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', 'x-wallaa-legal-version': CONFIG.privacyPolicyVersion,
      'x-wallaa-installation-id': identity?.installationId || '', 'x-wallaa-install-token': identity?.authToken || '' },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Apple subscription unavailable.');
  return result;
}
export const readAppleSubscription = identity => request(identity, 'status');
const deliveries = new Map();
function confirm(identity, receipt, refresh) {
  const key = `${identity.authToken}:${receipt?.transactionId || receipt?.status}`;
  if (!deliveries.has(key)) deliveries.set(key, confirmApplePurchase(receipt, {
    verify: signedTransaction => request(identity, 'transactions', { signedTransaction }),
    finish: transactionId => Store.finish({ transactionId }), refresh
  }).finally(() => deliveries.delete(key)));
  return deliveries.get(key);
}
export async function loadAppleProduct(productId) { return Store.product({ productId }); }
export async function purchaseApplePro(identity, status, refresh) {
  if (!status?.enabled) throw new Error('Apple purchases are not available yet.');
  return confirm(identity, await Store.purchase({ productId: status.productId, appAccountToken: status.appAccountToken }), refresh);
}
export async function restoreApplePro(identity, refresh) {
  const status = await readAppleSubscription(identity);
  if (!status.enabled) throw new Error('Apple purchases are not available yet.');
  const { transactions = [] } = await Store.restore();
  for (const receipt of transactions) await confirm(identity, receipt, refresh);
  await refresh?.();
  return { restored: transactions.length };
}
export async function observeApplePurchases(identity, refresh) {
  if (!applePurchasesSupported() || !identity?.authToken) return () => {};
  const status = await readAppleSubscription(identity);
  if (!status.enabled) return () => {};
  const listener = await Store.addListener('transaction', receipt => {
    // Failed delivery stays unfinished and is recovered on the next connection.
    confirm(identity, receipt, refresh).catch(() => {});
  });
  try {
    const { transactions = [] } = await Store.pending();
    for (const receipt of transactions) await confirm(identity, receipt, refresh);
  } catch { /* Do not consume receipts after an offline or rejected verification. */ }
  return () => listener.remove();
}
export const manageAppleSubscription = () => Store.manage();
