import {
  Bluetooth, CheckCircle2, CircleAlert, Database, Globe2, Mail, MapPin, QrCode,
  RefreshCw, RotateCcw, Server, ShieldCheck, Smartphone, Sun, Trash2, UserRound, UsersRound, Radio, BellRing, Activity,
  KeyRound, Eye, EyeOff, Volume2, FileText, ExternalLink, LogOut, Pencil, Crown, Navigation
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { LANGUAGES } from '../i18n';
import { CONFIG } from '../config';
import { PHONE_COUNTRIES } from '../data/phoneCountries';

function ServiceDot({ ok, pending = false }) {
  return <i className={`service-dot ${pending ? 'pending' : ok ? 'ok' : 'bad'}`} />;
}

function formatDateOfBirth(value) {
  if (!value) return '—';

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return String(value);

  return `${match[3]}/${match[2]}/${match[1]}`;
}

export default function SettingsScreen({
  profile, onSaveProfile, armed, onArmed, onReset, appearance, onAppearance, onDeleteAccount, onSignOut,
  networkState, systemHealth, onRefreshSystemHealth, onTestEmail, onTestAlarmSound, onNavigate, connectionStatus, t
}) {
  const [showSafetyWord, setShowSafetyWord] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [draftProfile, setDraftProfile] = useState(profile);
  const checking = systemHealth?.status === 'checking';
  const online = systemHealth?.status === 'ready';
  const apiOk = online && (systemHealth?.authenticated === true || systemHealth?.apiKeyAccepted === true);
  const dbOk = online && systemHealth?.databaseOnline === true;
  const emailOk = online && systemHealth?.smtpConfigured === true;
  const pushOk = online && systemHealth?.apnsConfigured === true;
  const isPro = profile?.plan === 'pro';

  useEffect(() => { if (!editingProfile) setDraftProfile(profile); }, [profile, editingProfile]);

  async function saveEditedProfile() {
    await onSaveProfile({ ...profile, ...draftProfile });
    setEditingProfile(false);
  }

  return (
    <div className="screen v4-generic-screen v401-settings-screen">
      <div className="v4-screen-heading"><span>WALLAA</span><h1>{t('settings.title')}</h1><p>{t('v4.settings.subtitle')}</p></div>

      <div className="v412-settings-section-label">{t('v412.settings.accountSection')}</div>
      <section className="v4-settings-card">
        <div className="settings-row-title"><UserRound size={19}/><div><strong>{t('v4.settings.profile')}</strong><span>{t('v412.settings.profileLocked')}</span></div></div>
        {!editingProfile ? (
          <>
            <div className="v412-customer-id-card">
              <div><small>{t('v415.profile.customerId')}</small><strong>{profile.customerId || '—'}</strong></div>
              <span>{t('v415.profile.customerIdHint')}</span>
            </div>
            <div className="v412-profile-readonly">
              <div className="v412-profile-value"><small>{t('v4.settings.firstName')}</small><strong>{profile.firstName || '—'}</strong></div>
              <div className="v412-profile-value"><small>{t('v4.settings.lastName')}</small><strong>{profile.lastName || '—'}</strong></div>
              <div className="v412-profile-value wide"><small>Email</small><strong>{profile.email || '—'}</strong></div>
              <div className="v412-profile-value wide">
                <small>{t('v4.settings.phone')}</small>
                <strong>{profile.phone ? `${profile.countryCode || '+39'} ${profile.phone}` : '—'}</strong>
              </div>
              <div className="v412-profile-value wide">
                <small>Data di nascita</small>
                <strong>{formatDateOfBirth(profile.dateOfBirth)}</strong>
              </div>
              <div className="v412-profile-value"><small>Paese di nascita</small><strong>{profile.birthCountry || '—'}</strong></div>
              <div className="v412-profile-value"><small>Luogo di nascita</small><strong>{profile.birthPlace || '—'}</strong></div>
            </div>
            <button className="v412-edit-profile" type="button" onClick={() => { setDraftProfile(profile); setEditingProfile(true); }}><Pencil size={16}/> {t('v412.settings.editMyData')}</button>
          </>
        ) : (
          <>
            <div className="profile-grid">
              <input value={draftProfile.firstName||''} onChange={(e)=>setDraftProfile({...draftProfile,firstName:e.target.value})} placeholder={t('v4.settings.firstName')}/>
              <input value={draftProfile.lastName||''} onChange={(e)=>setDraftProfile({...draftProfile,lastName:e.target.value})} placeholder={t('v4.settings.lastName')}/>
              <input className="wide" value={draftProfile.email||''} onChange={(e)=>setDraftProfile({...draftProfile,email:e.target.value})} placeholder="Email" type="email"/>
              <div className="wide v420-profile-phone-row">
                <select
                  value={draftProfile.countryCode || '+39'}
                  onChange={(e)=>setDraftProfile({...draftProfile,countryCode:e.target.value})}
                  aria-label="Prefisso internazionale"
                >
                  {PHONE_COUNTRIES.map((country) => (
                    <option
                      key={`${country.iso}-${country.callingCode}`}
                      value={country.callingCode}
                    >
                      {country.flag} {country.name} {country.callingCode}
                    </option>
                  ))}
                </select>
                <input
                  value={draftProfile.phone||''}
                  onChange={(e)=>setDraftProfile({...draftProfile,phone:e.target.value})}
                  placeholder={t('v4.settings.phone')}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                />
              </div>

              <label className="wide v420-profile-dob">
                <span>Data di nascita</span>
                <input
                  value={draftProfile.dateOfBirth || ''}
                  onChange={(e)=>setDraftProfile({...draftProfile,dateOfBirth:e.target.value})}
                  type="date"
                  max={new Date().toISOString().slice(0,10)}
                  autoComplete="bday"
                />
              </label>
              <label className="wide v420-profile-dob"><span>Paese di nascita</span><select value={draftProfile.birthCountry || ''} onChange={(e)=>setDraftProfile({...draftProfile,birthCountry:e.target.value})}><option value="">Seleziona Paese</option>{PHONE_COUNTRIES.map((country)=><option key={country.iso} value={country.name}>{country.flag} {country.name}</option>)}</select></label>
              <label className="wide v420-profile-dob"><span>Luogo / città di nascita</span><input value={draftProfile.birthPlace || ''} onChange={(e)=>setDraftProfile({...draftProfile,birthPlace:e.target.value})} placeholder="Luogo di nascita"/></label>
            </div>
            <div className="v412-profile-actions"><button className="cancel" type="button" onClick={()=>{setDraftProfile(profile);setEditingProfile(false);}}>{t('common.close')}</button><button className="save" type="button" onClick={saveEditedProfile}>{t('common.save')}</button></div>
          </>
        )}
      </section>

      <section className="v404-safety-word-card">
        <div className="v404-safety-word-head">
          <div className="settings-row-title"><KeyRound size={19}/><div><strong>{t('v404.safetyWord.title')}</strong><span>{t('v404.safetyWord.subtitle')}</span></div></div>
          <span className="v404-private-badge">{t('v404.safetyWord.private')}</span>
        </div>
        <div className="v404-secret-input">
          <input type={showSafetyWord ? 'text' : 'password'} value={profile.safetyWord || ''} maxLength={32} autoCapitalize="words" autoCorrect="off" autoComplete="off" spellCheck="false" onChange={(e)=>onSaveProfile({...profile,safetyWord:e.target.value})} placeholder={t('v404.safetyWord.placeholder')} aria-label={t('v404.safetyWord.title')}/>
          <button type="button" onClick={()=>setShowSafetyWord((value)=>!value)} aria-label={showSafetyWord ? t('v404.safetyWord.hide') : t('v404.safetyWord.show')}>{showSafetyWord ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
        </div>
        <div className="v404-safety-word-note"><ShieldCheck size={16}/><p>{t('v404.safetyWord.body')}</p></div>
      </section>

      <div className="v412-settings-section-label">{t('v412.settings.essentialSection')}</div>
      <section className="v4-settings-card settings-switch-row">
        <div className="settings-row-title"><ShieldCheck size={19}/><div><strong>{t('settings.protection')}</strong><span>{t('v4.settings.protectionBody')}</span></div></div>
        <label className="v4-switch"><input type="checkbox" checked={armed} onChange={(e)=>onArmed(e.target.checked)}/><span/></label>
      </section>
      <section className="v4-settings-card settings-switch-row">
        <div className="settings-row-title"><MapPin size={19}/><div><strong>{t('v412.basic.locationTitle')}</strong><span>{t('v412.basic.locationBody')}</span></div></div>
        <label className="v4-switch"><input type="checkbox" checked={profile.sosLocationEnabled !== false} onChange={(e)=>onSaveProfile({...profile,sosLocationEnabled:e.target.checked})}/><span/></label>
      </section>

      <div className="v412-settings-section-label">WALLAA PRO</div>
      <section className="v4-settings-card v412-plan-card">
        <div className="settings-row-title"><Crown size={19}/><div><strong>Wallaa Pro</strong><span>{t('v412.pro.subtitle')}</span></div></div>
        <span className={`v412-plan-badge ${isPro ? 'pro' : ''}`}><Crown size={12}/>{isPro ? t('v412.pro.active') : t('v412.pro.basicPlan')}</span>
        <div className="v412-feature-list">
          <div className="v412-feature-row"><UsersRound size={18}/><span><strong>{t('v412.pro.contactsTitle')}</strong><small>{isPro ? t('v412.pro.contactsPro') : t('v412.pro.contactsBasic')}</small></span><i className={`v412-feature-state ${isPro?'':'locked'}`}>{isPro ? t('v412.pro.included') : 'PRO'}</i></div>
          <div className="v412-feature-row"><Server size={18}/><span><strong>Wallaa Operating Center</strong><small>{t('v412.pro.centerBody')}</small></span><i className={`v412-feature-state ${isPro?'':'locked'}`}>{isPro ? t('v412.pro.activeShort') : 'PRO'}</i></div>
          <div className="v412-feature-row"><Navigation size={18}/><span><strong>{t('v412.pro.liveTitle')}</strong><small>{isPro ? t('v412.pro.livePro') : t('v412.pro.liveBasic')}</small></span><i className={`v412-feature-state ${isPro?'':'locked'}`}>{isPro ? t('v412.pro.activeShort') : 'PRO'}</i></div>
        </div>
        {!isPro && <p className="v404-sound-note">{t('v412.pro.futureBilling')}</p>}
      </section>
      <section className={`v4-settings-card settings-switch-row v419-live-protection ${!isPro ? 'locked' : ''}`}>
        <div className="settings-row-title"><Navigation size={19}/><div><strong>Guardian Mode</strong><span>{isPro ? 'Condividi la posizione con i Guardian autorizzati e la Centrale Wallaa mentre Guardian Mode è attiva. iOS può sospendere gli aggiornamenti in background.' : 'Disponibile con Wallaa Pro.'}</span></div></div>
        <label className="v4-switch"><input type="checkbox" disabled={!isPro} checked={isPro && profile.liveProtectionEnabled === true} onChange={(e)=>onSaveProfile({...profile,liveProtectionEnabled:e.target.checked})}/><span/></label>
      </section>

      <div className="v412-settings-section-label">{t('v412.settings.systemSection')}</div>
      <section className="v404-sound-card">
        <div className="settings-row-title"><Volume2 size={19}/><div><strong>{t('v404.sound.title')}</strong><span>{t('v404.sound.subtitle')}</span></div></div>
        <div className="v404-sound-policy"><div><span>{t('v404.sound.sos')}</span><strong>{t('v404.sound.silentHaptic')}</strong></div><div><span>{t('v404.sound.guardian')}</span><strong>{t('v404.sound.audible')}</strong></div></div>
        <button className="v404-sound-test" type="button" onClick={()=>onTestAlarmSound?.()}><Volume2 size={17}/><span>{t('v404.sound.test')}</span></button>
        <p className="v404-sound-note">{t('v404.sound.note')}</p>
      </section>

      <section className="v401-services-card">
        <div className="v401-section-title"><div><Server size={19}/><span><strong>{t('v401.services.title')}</strong><small>{t('v401.services.subtitle')}</small></span></div><button type="button" onClick={onRefreshSystemHealth} disabled={checking} aria-label={t('v401.services.refresh')}><RefreshCw size={18} className={checking ? 'spin' : ''}/></button></div>
        <div className="v401-service-grid">
          <div><Server size={17}/><span><small>{t('v401.services.backend')}</small><strong>{apiOk ? t('v401.services.ready') : checking ? t('v401.services.checking') : t('v401.services.notReady')}</strong></span><ServiceDot ok={apiOk} pending={checking}/></div>
          <div><Database size={17}/><span><small>{t('v401.services.database')}</small><strong>{dbOk ? t('v401.services.ready') : t('v401.services.notReady')}</strong></span><ServiceDot ok={dbOk} pending={checking}/></div>
          <div><Mail size={17}/><span><small>{t('v401.services.email')}</small><strong>{emailOk ? t('v401.services.ready') : t('v401.services.notReady')}</strong></span><ServiceDot ok={emailOk} pending={checking}/></div>
          <div><Smartphone size={17}/><span><small>{t('v401.services.push')}</small><strong>{pushOk ? t('v401.services.ready') : t('v401.services.notReady')}</strong></span><ServiceDot ok={pushOk} pending={checking}/></div>
        </div>
        {systemHealth?.error && <div className="v401-service-error"><CircleAlert size={16}/><span>{systemHealth.error}</span></div>}
        <button className="v401-test-email" type="button" onClick={() => onTestEmail?.().catch(() => {})} disabled={!profile.email || checking}><Mail size={17}/><span><strong>{t('v401.services.testEmail')}</strong><small>{profile.email || t('v401.services.emailMissing')}</small></span></button>
      </section>

      <section className="v401-access-card">
        <div className="settings-row-title"><ShieldCheck size={19}/><div><strong>{t('v401.access.title')}</strong><span>{t('v401.access.subtitle')}</span></div></div>
        <div className="v401-access-grid">
          <button onClick={()=>onNavigate?.('active-alert')}><BellRing size={18}/><span>{t('v4.menu.activeAlert')}</span></button><button onClick={()=>onNavigate?.('device')}><Bluetooth size={18}/><span>{t('v4.menu.myButton')}</span></button><button onClick={()=>onNavigate?.('network')}><QrCode size={18}/><span>{t('v401.home.networkQr')}</span></button><button onClick={()=>onNavigate?.('contacts')}><UsersRound size={18}/><span>{t('v4.menu.emergencyContacts')}</span></button><button onClick={()=>onNavigate?.('map')}><MapPin size={18}/><span>{t('v4.menu.location')}</span></button><button onClick={()=>onNavigate?.('activity')}><Activity size={18}/><span>{t('nav.activity')}</span></button>
        </div>
        <div className={`v401-network-note ${networkState?.status === 'ready' ? 'ok' : ''}`}>{networkState?.status === 'ready' ? <CheckCircle2 size={16}/> : <CircleAlert size={16}/>}<span>{networkState?.status === 'ready' ? t('v401.access.networkReady') : t('v401.access.networkPending')}</span></div>
      </section>

      <section className="v402-guard-settings v409-event-only-guard">
        <div className="v402-guard-head"><div className="settings-row-title"><Radio size={19}/><div><strong>{t('v4.device.guardTitle')}</strong><span>{t('v409.guard.unavailableBody')}</span></div></div><span className="v409-guard-badge">{t('v409.guard.eventOnly')}</span></div>
        <div className="v402-connection-state"><i className={`status-dot ${connectionStatus}`}/><span>{connectionStatus === 'connected' ? t('v409.home.signalVerified') : connectionStatus === 'standby' ? t('v409.device.standby') : connectionStatus === 'weak' ? t('v4.device.weak') : t('v4.device.disconnected')}</span></div>
        <div className="v409-guard-explain"><ShieldCheck size={17}/><span>{t('v409.guard.explain')}</span></div>
      </section>

      <section className="v4-settings-card"><div className="settings-row-title"><Globe2 size={19}/><div><strong>{t('settings.language')}</strong><span>{t('v4.settings.languageBody')}</span></div></div><select value={profile.language||'en'} onChange={(e)=>onSaveProfile({...profile,language:e.target.value})}>{LANGUAGES.map((l)=><option key={l.code} value={l.code}>{l.label}</option>)}</select></section>
      <section className="v4-settings-card"><div className="settings-row-title"><Sun size={19}/><div><strong>{t('v4.settings.appearance')}</strong><span>{t('v4.settings.appearanceBody')}</span></div></div><div className="appearance-segment">{['system','light','dark'].map((mode)=><button type="button" key={mode} className={appearance.mode===mode?'active':''} onClick={()=>onAppearance(mode)}>{mode==='system'?t('v4.settings.auto'):mode==='light'?t('v4.settings.light'):t('v4.settings.dark')}</button>)}</div></section>

      <section className="v405-legal-card"><div className="settings-row-title"><FileText size={19}/><div><strong>{t('v405.legal.title')}</strong><span>{t('v405.legal.subtitle')}</span></div></div><button className="v411-privacy-open" type="button" onClick={()=>onNavigate('privacy')}><ShieldCheck size={18}/><span>{t('v411.privacy.open')}</span><ExternalLink size={15}/></button><a href={CONFIG.privacyPolicyUrl} target="_blank" rel="noreferrer"><span>{t('v405.legal.privacy')}</span><ExternalLink size={16}/></a><a href={CONFIG.termsUrl} target="_blank" rel="noreferrer"><span>{t('v405.legal.terms')}</span><ExternalLink size={16}/></a></section>
      <section className="v4-legal-note"><strong>{t('v4.settings.important')}</strong><p>{t('v4.settings.legal')}</p></section>
      <button className="danger-outline" onClick={onReset}><RotateCcw size={18}/> {t('v4.settings.reset')}</button>
      <button className="v405-signout-button" onClick={onSignOut}><LogOut size={18}/> {t('v405.auth.signOut')}</button>
      <button className="delete-account-button" onClick={onDeleteAccount}><Trash2 size={18}/> {t('v4.settings.deleteAccount')}</button>
    </div>
  );
}
