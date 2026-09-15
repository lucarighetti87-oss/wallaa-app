import { useMemo, useState } from 'react';
import { Check, ExternalLink, FileText, ShieldCheck } from 'lucide-react';
import { CONFIG } from '../config';

const COPY = {
  it: {
    kicker: 'AGGIORNAMENTO LEGALE',
    title: 'Documenti aggiornati',
    body: 'Prima di continuare devi prendere visione dei documenti legali Wallaa aggiornati.',
    privacy: 'Ho letto la Privacy Policy',
    terms: 'Accetto i Termini di Servizio',
    safety: 'Ho letto e compreso il Safety Notice',
    receipt: 'Dopo la conferma riceverai via email una copia dei documenti accettati.',
    accept: 'CONFERMA E CONTINUA',
    saving: 'REGISTRAZIONE…',
    signout: 'Esci dall’account',
    error: 'Non è stato possibile registrare l’accettazione. Riprova.'
  },
  en: {
    kicker: 'LEGAL UPDATE',
    title: 'Updated documents',
    body: 'Before continuing, you must review the updated Wallaa legal documents.',
    privacy: 'I have read the Privacy Policy',
    terms: 'I accept the Terms of Service',
    safety: 'I have read and understood the Safety Notice',
    receipt: 'After confirmation, you will receive a copy of the accepted documents by email.',
    accept: 'CONFIRM AND CONTINUE',
    saving: 'SAVING…',
    signout: 'Sign out',
    error: 'We could not record your acceptance. Please try again.'
  },
  es: {
    kicker: 'ACTUALIZACIÓN LEGAL',
    title: 'Documentos actualizados',
    body: 'Antes de continuar debes revisar los documentos legales actualizados de Wallaa.',
    privacy: 'He leído la Política de Privacidad',
    terms: 'Acepto los Términos de Servicio',
    safety: 'He leído y comprendido el Safety Notice',
    receipt: 'Después de confirmar recibirás por email una copia de los documentos aceptados.',
    accept: 'CONFIRMAR Y CONTINUAR',
    saving: 'GUARDANDO…',
    signout: 'Cerrar sesión',
    error: 'No se pudo registrar la aceptación. Inténtalo de nuevo.'
  },
  fr: {
    kicker: 'MISE À JOUR JURIDIQUE',
    title: 'Documents mis à jour',
    body: 'Avant de continuer, vous devez consulter les documents juridiques Wallaa mis à jour.',
    privacy: 'J’ai lu la Politique de confidentialité',
    terms: 'J’accepte les Conditions de service',
    safety: 'J’ai lu et compris le Safety Notice',
    receipt: 'Après confirmation, vous recevrez par email une copie des documents acceptés.',
    accept: 'CONFIRMER ET CONTINUER',
    saving: 'ENREGISTREMENT…',
    signout: 'Se déconnecter',
    error: 'Impossible d’enregistrer votre acceptation. Réessayez.'
  },
  de: {
    kicker: 'RECHTLICHES UPDATE',
    title: 'Aktualisierte Dokumente',
    body: 'Bevor du fortfährst, musst du die aktualisierten Wallaa-Rechtsdokumente prüfen.',
    privacy: 'Ich habe die Datenschutzerklärung gelesen',
    terms: 'Ich akzeptiere die Nutzungsbedingungen',
    safety: 'Ich habe den Safety Notice gelesen und verstanden',
    receipt: 'Nach der Bestätigung erhältst du per E-Mail eine Kopie der akzeptierten Dokumente.',
    accept: 'BESTÄTIGEN UND FORTFAHREN',
    saving: 'WIRD GESPEICHERT…',
    signout: 'Abmelden',
    error: 'Die Zustimmung konnte nicht gespeichert werden. Bitte erneut versuchen.'
  },
  pt: {
    kicker: 'ATUALIZAÇÃO LEGAL',
    title: 'Documentos atualizados',
    body: 'Antes de continuar, tens de consultar os documentos legais Wallaa atualizados.',
    privacy: 'Li a Política de Privacidade',
    terms: 'Aceito os Termos de Serviço',
    safety: 'Li e compreendi o Safety Notice',
    receipt: 'Após a confirmação receberás por email uma cópia dos documentos aceites.',
    accept: 'CONFIRMAR E CONTINUAR',
    saving: 'A GUARDAR…',
    signout: 'Terminar sessão',
    error: 'Não foi possível registar a aceitação. Tenta novamente.'
  }
};

export default function LegalUpdateScreen({
  language = 'en',
  onAccept,
  onSignOut,
  legalError = ''
}) {
  const copy = COPY[language] || COPY.en;

  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [safetyNoticeAccepted, setSafetyNoticeAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const ready = useMemo(
    () => privacyAccepted && termsAccepted && safetyNoticeAccepted,
    [privacyAccepted, termsAccepted, safetyNoticeAccepted]
  );

  async function submit(event) {
    event.preventDefault();
    if (!ready || saving) return;

    setSaving(true);
    setError('');

    try {
      await onAccept({
        privacyAccepted,
        termsAccepted,
        safetyNoticeAccepted
      });
    } catch (err) {
      setError(err?.message || copy.error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="onboarding-screen v405-auth-screen">
      <div className="v405-auth-orb v405-auth-orb-one"/>
      <div className="v405-auth-orb v405-auth-orb-two"/>

      <header className="onboarding-top">
        <span/>
        <strong>WALLAA</strong>
        <span/>
      </header>

      <div className="v405-auth-shield">
        <img src="/wallaa-app-icon.png" alt="Wallaa"/>
      </div>

      <div className="onboarding-copy">
        <span className="v405-auth-kicker">{copy.kicker}</span>
        <div className="wallaa-brand-slogan">Stay safe. Press Wallaa.</div>
        <h1>{copy.title}</h1>
        <p>{copy.body}</p>
      </div>

      <form className="onboarding-form v405-auth-form" onSubmit={submit}>
        <div className="onboarding-consents v405-consents">

          <label className="check-row">
            <input
              type="checkbox"
              checked={privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
            />
            <span className="check-box">
              {privacyAccepted && <Check size={14}/>}
            </span>
            <span>
              <a
                href={CONFIG.privacyPolicyUrl}
                target="_blank"
                rel="noreferrer"
              >
                {copy.privacy}
              </a>
            </span>
          </label>

          <label className="check-row">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
            />
            <span className="check-box">
              {termsAccepted && <Check size={14}/>}
            </span>
            <span>
              <a
                href={CONFIG.termsUrl}
                target="_blank"
                rel="noreferrer"
              >
                {copy.terms}
              </a>
            </span>
          </label>

          <label className="check-row v411-safety-consent">
            <input
              type="checkbox"
              checked={safetyNoticeAccepted}
              onChange={(e) => setSafetyNoticeAccepted(e.target.checked)}
            />
            <span className="check-box">
              {safetyNoticeAccepted && <Check size={14}/>}
            </span>
            <span>
              <a
                href={CONFIG.safetyNoticeUrl}
                target="_blank"
                rel="noreferrer"
              >
                {copy.safety}
              </a>
            </span>
          </label>

        </div>

        <div className="v411-legal-links">
          <a href={CONFIG.privacyPolicyUrl} target="_blank" rel="noreferrer">
            <FileText size={17}/>
            <span>Privacy Policy · {CONFIG.privacyPolicyVersion}</span>
            <ExternalLink size={15}/>
          </a>

          <a href={CONFIG.termsUrl} target="_blank" rel="noreferrer">
            <FileText size={17}/>
            <span>Terms · {CONFIG.termsVersion}</span>
            <ExternalLink size={15}/>
          </a>

          <a href={CONFIG.safetyNoticeUrl} target="_blank" rel="noreferrer">
            <ShieldCheck size={17}/>
            <span>Safety Notice · {CONFIG.safetyNoticeVersion}</span>
            <ExternalLink size={15}/>
          </a>
        </div>

        <p className="v405-auth-security">{copy.receipt}</p>

        {(error || legalError) && (
          <div className="onboarding-error" role="alert">
            {error || legalError}
          </div>
        )}

        <button
          className="onboarding-submit v405-auth-submit"
          type="submit"
          disabled={!ready || saving}
        >
          <ShieldCheck size={18}/>
          {saving ? copy.saving : copy.accept}
        </button>
      </form>

      <p className="v405-auth-switch">
        <button type="button" onClick={onSignOut}>
          {copy.signout}
        </button>
      </p>
    </div>
  );
}
