import { useEffect, useState } from 'react';
import { CONFIG } from '../config';
import { applePurchasesSupported, readAppleSubscription, loadAppleProduct, purchaseApplePro, restoreApplePro, manageAppleSubscription } from '../services/appleSubscriptions';

const defaultGateway = { supported: applePurchasesSupported, status: readAppleSubscription, product: loadAppleProduct, buy: purchaseApplePro, restore: restoreApplePro, manage: manageAppleSubscription };
const messages = {
  it: { buy:'Attiva Wallaa Pro', restore:'Ripristina acquisti', manage:'Gestisci abbonamento Apple', month:'al mese', unavailable:'Gli acquisti Apple saranno disponibili dopo il completamento della configurazione.', terms:'Termini', privacy:'Privacy', renewal:'Abbonamento mensile con rinnovo automatico. Il pagamento è addebitato al tuo account Apple. Puoi annullare il rinnovo nelle impostazioni Apple almeno 24 ore prima della scadenza.', pending:'Acquisto in attesa di approvazione Apple.', success:'Acquisto verificato. Il tuo piano è aggiornato.', restored:'Acquisti ripristinati.', empty:'Nessun acquisto Apple da ripristinare per questo account.', busy:'Verifica in corso…', failed:'Impossibile completare la verifica. Riprova o ripristina gli acquisti.', other:'Il tuo accesso Pro attuale non richiede un nuovo acquisto.' },
  en: { buy:'Activate Wallaa Pro', restore:'Restore purchases', manage:'Manage Apple subscription', month:'per month', unavailable:'Apple purchases will be available once setup is complete.', terms:'Terms', privacy:'Privacy', renewal:'Monthly subscription with automatic renewal. Payment is charged to your Apple account. Cancel renewal in Apple settings at least 24 hours before expiry.', pending:'Purchase awaiting Apple approval.', success:'Purchase verified. Your plan is updated.', restored:'Purchases restored.', empty:'No Apple purchases to restore for this account.', busy:'Verifying…', failed:'Verification could not be completed. Try again or restore purchases.', other:'Your current Pro access does not require another purchase.' }
};
Object.assign(messages, {"es": {"buy": "Activar Wallaa Pro", "restore": "Restaurar compras", "manage": "Gestionar suscripción de Apple", "month": "al mes", "unavailable": "Las compras de Apple estarán disponibles cuando termine la configuración.", "terms": "Condiciones", "privacy": "Privacidad", "renewal": "Suscripción mensual con renovación automática. El pago se carga a tu cuenta de Apple. Cancela la renovación en los ajustes de Apple al menos 24 horas antes del vencimiento.", "pending": "Compra pendiente de aprobación de Apple.", "success": "Compra verificada. Tu plan está actualizado.", "restored": "Compras restauradas.", "empty": "No hay compras de Apple que restaurar para esta cuenta.", "busy": "Verificando…", "failed": "No se pudo completar la verificación. Inténtalo de nuevo o restaura las compras.", "other": "Tu acceso Pro actual no requiere otra compra."}, "fr": {"buy": "Activer Wallaa Pro", "restore": "Restaurer les achats", "manage": "Gérer l’abonnement Apple", "month": "par mois", "unavailable": "Les achats Apple seront disponibles une fois la configuration terminée.", "terms": "Conditions", "privacy": "Confidentialité", "renewal": "Abonnement mensuel avec renouvellement automatique. Le paiement est débité de votre compte Apple. Annulez le renouvellement dans les réglages Apple au moins 24 heures avant l’échéance.", "pending": "Achat en attente d’approbation Apple.", "success": "Achat vérifié. Votre forfait est à jour.", "restored": "Achats restaurés.", "empty": "Aucun achat Apple à restaurer pour ce compte.", "busy": "Vérification…", "failed": "La vérification n’a pas pu être terminée. Réessayez ou restaurez les achats.", "other": "Votre accès Pro actuel ne nécessite pas de nouvel achat."}, "de": {"buy": "Wallaa Pro aktivieren", "restore": "Käufe wiederherstellen", "manage": "Apple-Abonnement verwalten", "month": "pro Monat", "unavailable": "Apple-Käufe sind verfügbar, sobald die Einrichtung abgeschlossen ist.", "terms": "Bedingungen", "privacy": "Datenschutz", "renewal": "Monatliches Abonnement mit automatischer Verlängerung. Die Zahlung wird Ihrem Apple-Konto belastet. Kündigen Sie die Verlängerung in den Apple-Einstellungen mindestens 24 Stunden vor Ablauf.", "pending": "Kauf wartet auf die Genehmigung von Apple.", "success": "Kauf bestätigt. Ihr Tarif wurde aktualisiert.", "restored": "Käufe wiederhergestellt.", "empty": "Für dieses Konto gibt es keine Apple-Käufe zum Wiederherstellen.", "busy": "Überprüfung…", "failed": "Die Überprüfung konnte nicht abgeschlossen werden. Versuchen Sie es erneut oder stellen Sie die Käufe wieder her.", "other": "Ihr aktueller Pro-Zugang erfordert keinen weiteren Kauf."}, "pt": {"buy": "Ativar Wallaa Pro", "restore": "Restaurar compras", "manage": "Gerir assinatura Apple", "month": "por mês", "unavailable": "As compras Apple estarão disponíveis quando a configuração estiver concluída.", "terms": "Termos", "privacy": "Privacidade", "renewal": "Assinatura mensal com renovação automática. O pagamento é debitado da sua conta Apple. Cancele a renovação nas definições Apple pelo menos 24 horas antes do vencimento.", "pending": "Compra a aguardar aprovação da Apple.", "success": "Compra verificada. O seu plano foi atualizado.", "restored": "Compras restauradas.", "empty": "Não há compras Apple para restaurar nesta conta.", "busy": "A verificar…", "failed": "Não foi possível concluir a verificação. Tente novamente ou restaure as compras.", "other": "O seu acesso Pro atual não requer outra compra."}});
const deletionNotices = {"it": "Se hai un abbonamento Apple, eliminare l’account Wallaa non lo annulla. Puoi gestirlo nelle impostazioni degli abbonamenti Apple.", "en": "If you have an Apple subscription, deleting your Wallaa account does not cancel it. Manage it in Apple subscription settings.", "es": "Si tienes una suscripción de Apple, eliminar tu cuenta Wallaa no la cancela. Puedes gestionarla en los ajustes de suscripciones de Apple.", "fr": "Si vous avez un abonnement Apple, supprimer votre compte Wallaa ne l’annule pas. Gérez-le dans les réglages des abonnements Apple.", "de": "Wenn Sie ein Apple-Abonnement haben, wird es durch das Löschen Ihres Wallaa-Kontos nicht gekündigt. Verwalten Sie es in den Apple-Abonnementeinstellungen.", "pt": "Se tiver uma assinatura Apple, eliminar a conta Wallaa não a cancela. Pode geri-la nas definições de assinaturas Apple."};
export const appleDeletionNotice = language => deletionNotices[language] || deletionNotices.en;
export default function AppleProSubscription({ identity, isPro, language, refresh, gateway = defaultGateway }) {
  const text = messages[language] || messages.en;
  const [status, setStatus] = useState(null), [product, setProduct] = useState(null);
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const supported = gateway.supported();
  useEffect(() => {
    if (!supported || !identity?.authToken) return;
    let cancelled = false;
    gateway.status(identity).then(async value => {
      if (cancelled) return;
      setStatus(value);
      if (value.enabled) { const item = await gateway.product(value.productId); if (!cancelled) setProduct(item); }
    }).catch(() => { if (!cancelled) setNotice(text.failed); });
    return () => { cancelled = true; };
  }, [supported, identity?.authToken, text.failed]);
  if (!supported) return null;
  const run = async (action, manage = false) => {
    if (busy) return;
    setBusy(true); setNotice('');
    try {
      const result = await action();
      setNotice(manage ? '' : result?.status === 'cancelled' ? '' : result?.status === 'pending' ? text.pending : result?.restored === 0 ? text.empty : result?.restored ? text.restored : text.success);
      setStatus(await gateway.status(identity));
    } catch { setNotice(text.failed); } finally { setBusy(false); }
  };
  return <div className="apple-pro-purchase" aria-busy={busy}>
    {status?.enabled && product ? <>
      {!isPro && <><strong className="apple-pro-price">{product.displayPrice} <small>{text.month}</small></strong><button type="button" className="primary-button" disabled={busy} onClick={() => run(() => gateway.buy(identity,status,refresh))}>{text.buy}</button><p>{text.renewal}</p></>}
      {isPro && !status.subscription && <p>{text.other}</p>}
      <button type="button" disabled={busy} onClick={() => run(() => gateway.restore(identity,refresh))}>{text.restore}</button>
      {status.subscription && <button type="button" disabled={busy} onClick={() => run(gateway.manage,true)}>{text.manage}</button>}
      <div className="apple-pro-legal"><a href={CONFIG.termsUrl} target="_blank" rel="noreferrer">{text.terms}</a><a href={CONFIG.privacyPolicyUrl} target="_blank" rel="noreferrer">{text.privacy}</a></div>
    </> : <p>{text.unavailable}</p>}
    {(busy || notice) && <p role="status" aria-live="polite">{busy ? text.busy : notice}</p>}
  </div>;
}
