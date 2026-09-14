import { Check, Eye, EyeOff, Lock, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CONFIG } from '../config';
import { resendWallaaVerification } from '../services/network';

export default function OnboardingScreen({ profile, onComplete, onLogin, t, initialMode = 'register' }) {
  const [mode, setMode] = useState(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationMessage, setVerificationMessage] = useState('');
  const [resending, setResending] = useState(false);
  const [form, setForm] = useState({
    firstName: profile.firstName || '', lastName: profile.lastName || '', email: profile.email || '',
    phone: profile.phone || '', countryCode: profile.countryCode || '+39', privacyAccepted: false,
    termsAccepted: false, safetyNoticeAccepted: false, password: '', confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const isLogin = mode === 'login';
  const title = isLogin ? t('v405.auth.loginTitle') : t('v4.onboarding.title');
  const subtitle = isLogin ? t('v405.auth.loginSubtitle') : t('v4.onboarding.subtitle');
  const passwordsMatch = isLogin || (form.password.length >= 8 && form.password === form.confirmPassword);
  const canSubmit = useMemo(() => isLogin
    ? Boolean(form.email.trim() && form.password)
    : Boolean(form.firstName.trim() && form.lastName.trim() && form.email.trim() && form.phone.trim() && passwordsMatch && form.privacyAccepted && form.termsAccepted && form.safetyNoticeAccepted), [form, isLogin, passwordsMatch]);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const switchMode = (next) => { setMode(next); setError(''); setVerificationEmail(''); setVerificationMessage(''); set('password', ''); set('confirmPassword', ''); };

  async function submit(e) {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      if (isLogin) {
        await onLogin({ identifier: form.email, password: form.password });
      } else {
        if (form.password !== form.confirmPassword) throw new Error(t('v417.auth.passwordMismatch'));
        const result = await onComplete({ ...form });
        if (result?.pendingVerification) {
          setVerificationEmail(result.email || form.email.trim());
          if (result.verificationEmailSent === false) {
            setVerificationMessage(t('v418.auth.accountCreatedEmailPending'));
          } else if (result.alreadyExists) {
            setVerificationMessage(t('v418.auth.accountPendingResent'));
          } else {
            setVerificationMessage(t('v417.auth.verificationSent'));
          }
        }
      }
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function resendVerification() {
    setError(''); setVerificationMessage(''); setResending(true);
    try {
      await resendWallaaVerification({ email: verificationEmail });
      setVerificationMessage(t('v417.auth.verificationResent'));
    } catch (err) { setError(err.message); }
    finally { setResending(false); }
  }

  if (verificationEmail) {
    return (
      <div className="onboarding-screen v405-auth-screen">
        <div className="v405-auth-orb v405-auth-orb-one"/><div className="v405-auth-orb v405-auth-orb-two"/>
        <header className="onboarding-top"><span/><strong>WALLAA</strong><span/></header>
        <div className="v405-auth-shield"><img src="/wallaa-app-icon.png" alt="Wallaa"/></div>
        <div className="v417-verification-card">
          <div className="v417-verification-icon"><Mail size={28}/></div>
          <span className="v405-auth-kicker">WALLAA ACCOUNT</span>
          <h1>{t('v417.auth.verifyTitle')}</h1>
          <p>{t('v417.auth.verifyBody')}</p>
          <strong className="v417-verification-email">{verificationEmail}</strong>
          <p className="v417-verification-note">{t('v417.auth.verifyNote')}</p>
          {verificationMessage && <div className="v417-verification-success">{verificationMessage}</div>}
          {error && <div className="onboarding-error" role="alert">{error}</div>}
          <button className="onboarding-submit v405-auth-submit" type="button" onClick={() => { setMode('login'); setVerificationEmail(''); set('email', verificationEmail); set('password', ''); set('confirmPassword', ''); }}>
            <ShieldCheck size={18}/>{t('v417.auth.verifiedSignIn')}
          </button>
          <button className="v417-resend" type="button" disabled={resending} onClick={resendVerification}>{resending ? t('v405.auth.working') : t('v417.auth.resend')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-screen v405-auth-screen">
      <div className="v405-auth-orb v405-auth-orb-one"/><div className="v405-auth-orb v405-auth-orb-two"/>
      <header className="onboarding-top"><span/><strong>WALLAA</strong><span/></header>
      <div className="v405-auth-shield"><img src="/wallaa-app-icon.png" alt="Wallaa"/></div>
      <div className="onboarding-copy"><span className="v405-auth-kicker">PERSONAL SAFETY ECOSYSTEM</span><div className="wallaa-brand-slogan">Stay safe. Press Wallaa.</div><h1>{title}</h1><p>{subtitle}</p></div>

      <div className="v405-auth-mode" role="tablist" aria-label={t('v405.auth.accountMode')}>
        <button type="button" className={!isLogin ? 'active' : ''} onClick={() => switchMode('register')}>{t('v405.auth.createAccount')}</button>
        <button type="button" className={isLogin ? 'active' : ''} onClick={() => switchMode('login')}>{t('v405.auth.signIn')}</button>
      </div>

      <form className="onboarding-form v405-auth-form" onSubmit={submit}>
        {!isLogin && <div className="v405-auth-name-row">
          <label><UserRound size={17}/><input value={form.firstName} onChange={(e)=>set('firstName',e.target.value)} placeholder={t('v4.onboarding.firstName')} autoComplete="given-name"/></label>
          <label><UserRound size={17}/><input value={form.lastName} onChange={(e)=>set('lastName',e.target.value)} placeholder={t('v4.onboarding.lastName')} autoComplete="family-name"/></label>
        </div>}
        <label><Mail size={17}/><input value={form.email} onChange={(e)=>set('email',e.target.value)} placeholder={isLogin ? t('v415.auth.identifierPlaceholder') : 'Email'} type={isLogin ? 'text' : 'email'} inputMode={isLogin ? 'text' : 'email'} autoCapitalize="none" autoComplete={isLogin ? 'username' : 'email'}/></label>
        {!isLogin && <label className="phone-row"><Phone size={17}/><span className="country-code">🇮🇹 {form.countryCode}</span><input value={form.phone} onChange={(e)=>set('phone',e.target.value)} placeholder={t('v4.onboarding.phone')} type="tel" autoComplete="tel"/></label>}
        <label className="v405-password-row"><Lock size={17}/><input value={form.password} onChange={(e)=>set('password',e.target.value)} placeholder={isLogin ? t('v405.auth.password') : t('v4.onboarding.password')} type={showPassword ? 'text' : 'password'} autoComplete={isLogin ? 'current-password' : 'new-password'}/><button type="button" onClick={()=>setShowPassword((value)=>!value)} aria-label={showPassword ? t('v404.safetyWord.hide') : t('v404.safetyWord.show')}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></label>
        {!isLogin && <>
          <label className={`v405-password-row ${form.confirmPassword && !passwordsMatch ? 'v417-password-mismatch' : ''}`}><Lock size={17}/><input value={form.confirmPassword} onChange={(e)=>set('confirmPassword',e.target.value)} placeholder={t('v417.auth.confirmPassword')} type={showPassword ? 'text' : 'password'} autoComplete="new-password"/><span className="v417-password-status">{form.confirmPassword && passwordsMatch ? <Check size={18}/> : null}</span></label>
          {form.confirmPassword && !passwordsMatch && <div className="v417-password-help">{t('v417.auth.passwordMismatch')}</div>}
        </>}

        {!isLogin && <div className="onboarding-consents v405-consents">
          <label className="check-row"><input type="checkbox" checked={form.privacyAccepted} onChange={(e)=>set('privacyAccepted',e.target.checked)}/><span className="check-box">{form.privacyAccepted && <Check size={14}/>}</span><span>{t('v405.legal.acceptPrivacy')} <a href={CONFIG.privacyPolicyUrl} target="_blank" rel="noreferrer">{t('v405.legal.privacy')}</a></span></label>
          <label className="check-row"><input type="checkbox" checked={form.termsAccepted} onChange={(e)=>set('termsAccepted',e.target.checked)}/><span className="check-box">{form.termsAccepted && <Check size={14}/>}</span><span>{t('v405.legal.acceptTerms')} <a href={CONFIG.termsUrl} target="_blank" rel="noreferrer">{t('v405.legal.terms')}</a></span></label>
          <label className="check-row v411-safety-consent"><input type="checkbox" checked={form.safetyNoticeAccepted} onChange={(e)=>set('safetyNoticeAccepted',e.target.checked)}/><span className="check-box">{form.safetyNoticeAccepted && <Check size={14}/>}</span><span>{t('v411.legal.safetyNotice')}</span></label>
        </div>}

        {error && <div className="onboarding-error" role="alert">{error}</div>}
        <button className="onboarding-submit v405-auth-submit" disabled={saving || !canSubmit} type="submit"><ShieldCheck size={18}/>{saving ? t('v405.auth.working') : isLogin ? t('v405.auth.signIn') : t('v4.onboarding.register')}</button>
      </form>

      <p className="v405-auth-switch">{isLogin ? t('v405.auth.noAccount') : t('v4.onboarding.haveAccount')} <button type="button" onClick={()=>switchMode(isLogin ? 'register' : 'login')}>{isLogin ? t('v405.auth.createAccount') : t('v4.onboarding.login')}</button></p>
      <p className="v405-auth-security"><Lock size={13}/>{t('v405.auth.securityNote')}</p>
    </div>
  );
}
