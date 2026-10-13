// Keep StoreKit transactions unfinished until Wallaa has persisted the verified receipt.
export async function confirmApplePurchase(receipt, { verify, finish, refresh }) {
  if (!receipt || receipt.status === 'cancelled' || receipt.status === 'pending') return receipt;
  if (!receipt.signedTransaction || !receipt.transactionId) throw new Error('Apple purchase receipt missing.');
  const result = await verify(receipt.signedTransaction);
  if (result.verified !== true || result.transactionId !== receipt.transactionId) throw new Error('Apple purchase was not confirmed by Wallaa.');
  await finish(receipt.transactionId);
  await refresh?.();
  return result;
}
