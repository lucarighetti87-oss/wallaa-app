import Modal from './Modal';
import {uiText} from '../uiText';
export default function GuardianContactEditor({draft,onChange,saving,onSubmit,onDelete,onClose,t}){
 if(!draft)return null;
 return (
      <Modal open={Boolean(draft)} onBack={onClose} title={draft.id || draft.linkId ? t('v4.guardian.edit') : t('v4.guardian.new')} onClose={onClose} className="guardian-editor-sheet">
        <form className="modal-form guardian-modal-form" onSubmit={onSubmit}>
          <label>{t('v4.guardian.name')}<input className="input" disabled={Boolean(draft.linkId)} value={draft.name} onChange={(e) => onChange({ ...draft, name:e.target.value })} placeholder={t('v4.guardian.namePlaceholder')} autoFocus={!draft.id&&!draft.linkId} /></label>
          <label>{"" + uiText("Email") + ""}<input className="input" type="email" readOnly={Boolean(draft.networkUserId||draft.linkId)} value={draft.email||''} onChange={(e) => onChange({ ...draft, email:e.target.value })} placeholder="guardian@email.com" /></label>
          <label>{t('v4.guardian.phone')}<input className="input" type="tel" readOnly={Boolean(draft.networkUserId||draft.linkId)} value={draft.phone||''} onChange={(e) => onChange({ ...draft, phone:e.target.value })} placeholder="+39…" /></label>
          <label>{uiText('Codice cliente Wallaa')}<input className="input" readOnly={Boolean(draft.networkUserId||draft.linkId)} value={draft.customerId||''} onChange={e=>onChange({...draft,customerId:e.target.value.toUpperCase()})} placeholder="WSB-…" autoCapitalize="characters" /></label>
          <p className="safety-editor-hint">{uiText(draft.networkUserId?'Dati aggiornati dal profilo Wallaa.':'Basta telefono, email o codice cliente. Se la persona usa Wallaa, viene riconosciuta come W Guardian.')}</p>
          <label>{t('v4.guardian.role')}<select className="input" value={draft.role||'guardian'} onChange={(e)=>onChange({...draft,role:e.target.value})}><option value="guardian">{t('v4.guardian.guardian')}</option><option value="primary">{t('v4.guardian.primary')}</option><option value="guardian_pro">Guardian Pro</option></select></label>
          <div className="guardian-permission-editor">
            {[['sosAlerts',t('v4.contacts.sos')],['liveLocation',t('v4.contacts.live')],['disconnectAlerts',t('v4.contacts.disconnect')]].map(([key,label])=><label key={key} className="permission-toggle"><span>{label}</span><input type="checkbox" checked={draft.permissions?.[key]!==false} onChange={(e)=>onChange({...draft,permissions:{...draft.permissions,[key]:e.target.checked}})}/></label>)}
          </div>
          <button className="v4-primary" type="submit" disabled={saving}>{saving?uiText('Verifica e salvataggio…'):t('v4.guardian.save')}</button>
          {draft.id && <button className="danger-outline full" type="button" onClick={onDelete}>{t('v4.guardian.delete')}</button>}
        </form>
      </Modal>
 );
}
