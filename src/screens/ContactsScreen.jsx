import { Building2, LockKeyhole, Mail, MoreHorizontal, Phone, Plus, ShieldCheck, Star, UserRound, UsersRound } from 'lucide-react';

function permissionCount(contact) {
  return ['sosAlerts','liveLocation','disconnectAlerts'].filter((key) => contact.permissions?.[key] !== false).length;
}

export default function ContactsScreen({ contacts, onAdd, onEdit, t, plan = 'basic' }) {
  const primary = contacts.find((contact) => contact.role === 'primary');
  const isPro = plan === 'pro';
  const limit = isPro ? 5 : 2;
  return (
    <div className="screen v4-generic-screen v402-contacts-screen">
      <header className="v402-screen-intro">
        <div>
          <span>{t('contacts.eyebrow')}</span>
          <h1>{t('v4.contacts.title')}</h1>
          <p>{t('contacts.subtitle')}</p>
        </div>
        <button className="v402-add-button" onClick={onAdd} aria-label={t('common.add')} disabled={contacts.length >= limit} title={contacts.length >= limit ? t(isPro ? 'v412.contacts.proLimit' : 'v412.contacts.basicLimit', { count: limit }) : ''}><Plus size={22}/></button>
      </header>

      <section className="v402-network-summary" aria-label={t('contacts.eyebrow')}>
        <div className="v402-summary-icon"><UsersRound size={20}/></div>
        <div><strong>{contacts.length}/{limit}</strong><span>{t('v402.contacts.guardiansConfigured')}</span></div>
        <div className="v402-summary-divider"/>
        <div><strong>{primary ? primary.name : '—'}</strong><span>{t('v402.contacts.primaryGuardian')}</span></div>
      </section>

      {isPro ? <section className="v410-operating-center" aria-label={t('v410.center.name')}>
        <div className="v410-center-icon"><Building2 size={23}/></div>
        <div className="v410-center-copy">
          <div className="v410-center-title"><strong>{t('v410.center.name')}</strong><span><LockKeyhole size={11}/>{t('v410.center.system')}</span></div>
          <p>{t('v412.center.proBody')}</p>
          <a href="mailto:safety@wallaasafety.com"><Mail size={13}/>safety@wallaasafety.com</a>
          <small>{t('v410.center.disclaimer')}</small>
        </div>
      </section> : <section className="v410-operating-center v412-basic-center"><div className="v410-center-icon"><LockKeyhole size={21}/></div><div className="v410-center-copy"><div className="v410-center-title"><strong>Wallaa Operating Center</strong><span>PRO</span></div><p>{t('v412.center.basicBody')}</p></div></section>}

      <div className="contacts-v4-list">
        {contacts.map((contact) => (
          <button className="guardian-card v402-guardian-card" key={contact.id} onClick={() => onEdit(contact)}>
            <div className="guardian-avatar"><UserRound size={27}/>{contact.role === 'primary' && <i><Star size={10} fill="currentColor"/></i>}</div>
            <div className="guardian-info">
              <div className="guardian-name-row"><strong>{contact.name}</strong><MoreHorizontal size={19}/></div>
              <div className="v402-role-line">
                <span className={`guardian-role ${contact.role === 'primary' ? 'primary' : ''}`}>{contact.role === 'primary' ? t('v4.contacts.primary') : t('v4.contacts.guardian')}</span>
                <small>{permissionCount(contact)}/3 {t('v402.contacts.permissions')}</small>
              </div>
              <div className="v402-contact-lines">
                {contact.phone && <span><Phone size={13}/>{contact.phone}</span>}
                {contact.email && <span><Mail size={13}/>{contact.email}</span>}
              </div>
              <div className="guardian-permissions v402-permission-chips">
                <span className={contact.permissions?.sosAlerts !== false ? 'on' : ''}><ShieldCheck size={13}/> {t('v4.contacts.sos')}</span>
                <span className={contact.permissions?.liveLocation !== false ? 'on' : ''}><ShieldCheck size={13}/> {t('v4.contacts.live')}</span>
                <span className={contact.permissions?.disconnectAlerts !== false ? 'on' : ''}><ShieldCheck size={13}/> {t('v4.contacts.disconnect')}</span>
              </div>
            </div>
          </button>
        ))}

        {!contacts.length && (
          <div className="v4-placeholder v402-contacts-empty">
            <ShieldCheck size={42}/><h2>{t('v4.contacts.emptyTitle')}</h2><p>{t('v4.contacts.emptyBody')}</p>
            <button className="v4-primary" onClick={onAdd}><Plus size={18}/>{t('v4.contacts.addGuardian')}</button>
          </div>
        )}
      </div>
    </div>
  );
}
