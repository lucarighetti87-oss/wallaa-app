import { Capacitor, registerPlugin } from '@capacitor/core';
import { CONFIG } from '../config';
import { confirmApplePurchase } from './applePurchaseFlow.mjs';

const Store = registerPlugin('WallaaStore');
export const applePurchasesSupported = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
async function request(identity, path, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  let response;
  try { response = await fetch(`${CONFIG.apiBaseUrl}/api/billing/apple/${path}`, {
    signal: controller.signal,
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', 'x-wallaa-legal-version': CONFIG.privacyPolicyVersion,
      'x-wallaa-installation-id': identity?.installationId || '', 'x-wallaa-install-token': identity?.authToken || '' },
    ...(body ? { body: JSON.stringify(body) } : {})
  }); } finally { clearTimeout(timeout); }
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
  let closed = false, recovering = false;
  const listener = await Store.addListener('transaction', receipt => {
    if (!closed) confirm(identity, receipt, refresh).catch(() => {});
  });
  async function recover() {
    if (closed || recovering) return;
    recovering = true;
    try {
      const status = await readAppleSubscription(identity);
      if (closed || !status.enabled) return;
      const { transactions = [] } = await Store.pending();
      for (const receipt of transactions) {
        if (closed) break;
        await confirm(identity, receipt, refresh);
      }
    } catch { /* Offline or rejected receipts remain unfinished for the next recovery. */ }
    finally { recovering = false; }
  }
  const onVisible = () => { if (document.visibilityState === 'visible') recover(); };
  window.addEventListener('online', recover);
  document.addEventListener('visibilitychange', onVisible);
  recover();
  return () => {
    closed = true;
    window.removeEventListener('online', recover);
    document.removeEventListener('visibilitychange', onVisible);
    return listener.remove();
  };
}
export const manageAppleSubscription = () => Store.manage();
