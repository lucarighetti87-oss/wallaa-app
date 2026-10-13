import test from 'node:test';
import assert from 'node:assert/strict';
import { confirmApplePurchase } from '../src/services/applePurchaseFlow.mjs';
const receipt = { status:'verified', transactionId:'100001', signedTransaction:'apple-signed' };
test('cancellation and pending approvals cannot activate Pro or finish a transaction', async () => {
  for (const status of ['cancelled','pending']) {
    const forbidden = () => assert.fail('Payment side effect before approval');
    assert.equal((await confirmApplePurchase({status}, {verify:forbidden,finish:forbidden,refresh:forbidden})).status,status);
  }
});
test('server must persist the exact verified receipt before finishing and refreshing', async () => {
  const events = [];
  await confirmApplePurchase(receipt, {verify:async()=>{events.push('verify');return {verified:true,transactionId:receipt.transactionId};},finish:async()=>events.push('finish'),refresh:async()=>events.push('refresh')});
  assert.deepEqual(events,['verify','finish','refresh']);
});
test('offline or mismatched receipts remain unfinished for recovery', async () => {
  for (const verify of [async()=>{throw new Error('offline');},async()=>({verified:false}),async()=>({verified:true,transactionId:'another'})])
    await assert.rejects(confirmApplePurchase(receipt,{verify,finish:()=>assert.fail('Unconfirmed transaction consumed')}));
});
