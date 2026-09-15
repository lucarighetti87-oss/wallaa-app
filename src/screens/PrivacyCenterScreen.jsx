import { ExternalLink, FileText, MapPin, BellRing, Bluetooth, ShieldCheck, Trash2, UserRound, UsersRound, Database, Mail, EyeOff, LockKeyhole } from 'lucide-react';
import { CONFIG } from '../config';

function Row({ icon, title, body }) { return <div className="v411-privacy-row"><span className="v411-privacy-icon">{icon}</span><div><strong>{title}</strong><p>{body}</p></div></div>; }

export default function PrivacyCenterScreen({ profile, onNavigate, onDeleteAccount, t }) {
  return <div className="screen v4-generic-screen v411-privacy-screen">
    <div className="v4-screen-heading"><span>WALLAA</span><h1>{t('v411.privacy.title')}</h1><p>{t('v411.privacy.subtitle')}</p></div>

    <section className="v411-privacy-hero">
      <ShieldCheck size={28}/><div><strong>{t('v411.privacy.noTracking')}</strong><p>{t('v411.privacy.noTrackingBody')}</p></div>
    </section>

    <section className="v4-settings-card v411-privacy-card">
      <h2>{t('v411.privacy.dataTitle')}</h2>
      <Row icon={<UserRound size={18}/>} title={t('v411.privacy.accountData')} body={t('v411.privacy.accountDataBody')}/>
      <Row icon={<MapPin size={18}/>} title={t('v411.privacy.location')} body={t('v411.privacy.locationBody')}/>
      <Row icon={<UsersRound size={18}/>} title={t('v411.privacy.guardians')} body={t('v411.privacy.guardiansBody')}/>
      <Row icon={<Bluetooth size={18}/>} title={t('v411.privacy.device')} body={t('v411.privacy.deviceBody')}/>
      <Row icon={<BellRing size={18}/>} title={t('v411.privacy.notifications')} body={t('v411.privacy.notificationsBody')}/>
    </section>

    <section className="v4-settings-card v411-privacy-card">
      <h2>{t('v411.privacy.sharingTitle')}</h2>
      <Row icon={<Mail size={18}/>} title={t('v411.privacy.guardianSharing')} body={t('v411.privacy.guardianSharingBody')}/>
      <Row icon={<Database size={18}/>} title={t('v411.privacy.center')} body={t('v411.privacy.centerBody')}/>
      <Row icon={<EyeOff size={18}/>} title={t('v411.privacy.safetyWord')} body={t('v411.privacy.safetyWordBody')}/>
    </section>

    <section className="v4-settings-card v411-privacy-card">
      <h2>{t('v411.privacy.retentionTitle')}</h2>
      <Row icon={<LockKeyhole size={18}/>} title={t('v411.privacy.retention')} body={t('v411.privacy.retentionBody')}/>
      <Row icon={<Trash2 size={18}/>} title={t('v411.privacy.deletion')} body={t('v411.privacy.deletionBody')}/>
    </section>

    <section className="v411-legal-links">
      <a href={CONFIG.privacyPolicyUrl} target="_blank" rel="noreferrer"><FileText size={17}/><span>{t('v405.legal.privacy')}</span><ExternalLink size={15}/></a>
      <a href={CONFIG.termsUrl} target="_blank" rel="noreferrer"><FileText size={17}/><span>{t('v405.legal.terms')}</span><ExternalLink size={15}/></a>
      <a href={CONFIG.safetyNoticeUrl} target="_blank" rel="noreferrer"><ShieldCheck size={17}/><span>{t('v411.legal.safetyNotice')}</span><ExternalLink size={15}/></a>
      <a href={CONFIG.privacyChoicesUrl} target="_blank" rel="noreferrer"><ShieldCheck size={17}/><span>{t('v411.privacy.choices')}</span><ExternalLink size={15}/></a>
      <a href={`mailto:${CONFIG.privacyContactEmail}`}><Mail size={17}/><span>{CONFIG.privacyContactEmail}</span><ExternalLink size={15}/></a>
    </section>

    <section className="v411-legal-version"><span>{t('v411.privacy.policyVersion')}: {CONFIG.privacyPolicyVersion}</span><span>{t('v411.privacy.termsVersion')}: {CONFIG.termsVersion}</span><span>Safety Notice: {CONFIG.safetyNoticeVersion}</span></section>

    <button className="danger-outline full" onClick={onDeleteAccount}><Trash2 size={18}/>{t('v4.settings.deleteAccount')}</button>
    <button className="v4-primary" onClick={()=>onNavigate('settings')}>{t('common.close')}</button>
  </div>;
}
