import { BellRing, CheckCircle2, CircleAlert, Link2, QrCode, RefreshCw, ScanLine, ShieldCheck, Trash2, UserCheck, Users } from 'lucide-react';

export default function NetworkScreen({ profile, networkState, qrDataUrl, onScan, onRotate, onRemoveLink, onRefresh, t }) {
  const guardians = networkState.guardians || [];
  const following = networkState.following || [];
  const ready = networkState.status === 'ready';
  const cachedQr = Boolean(qrDataUrl);

  return (
    <div className="screen network-screen light-screen v401-network-screen">
      <div className="screen-title pro-title network-title">
        <div><p className="eyebrow dark">{t('network.eyebrow')}</p><h1>{t('network.title')}</h1><p>{t('network.subtitle')}</p></div>
        <button className="round-add" onClick={onRefresh} aria-label={t('network.refresh')}><RefreshCw size={21}/></button>
      </div>

      <section className={`network-hero-card ${ready ? 'online' : 'offline'}`}>
        <div className="network-orb network-orb-a"/><div className="network-orb network-orb-b"/>
        <div className="network-hero-copy">
          <span className="network-chip"><ShieldCheck size={14}/> {t('network.personalCode')}</span>
          <h2>{profile.name?.trim() || [profile.firstName, profile.lastName].filter(Boolean).join(' ') || t('network.wallaaId')}</h2>
          <p>{t('network.qrDesc')}</p>
          <span className={`v401-network-state ${ready ? 'ok' : cachedQr ? 'cached' : 'bad'}`}>
            {ready ? <CheckCircle2 size={13}/> : <CircleAlert size={13}/>} {ready ? t('v401.network.synced') : cachedQr ? t('v401.network.cached') : t('v401.network.notGenerated')}
          </span>
        </div>
        <div className="qr-premium-shell">
          <div className="qr-corners" aria-hidden="true"><i/><i/><i/><i/></div>
          {qrDataUrl ? <img src={qrDataUrl} alt={t('network.qrAlt')}/> : <div className="qr-loading"><QrCode size={54}/><small>{t('v401.network.waiting')}</small></div>}
          <span className="qr-center-mark">W</span>
        </div>
        <div className="qr-actions">
          <button className="network-primary" onClick={onScan} disabled={!ready}><ScanLine size={20}/> {t('network.scanQr')}</button>
          <button className="network-secondary" onClick={onRotate} disabled={!ready}><RefreshCw size={18}/> {t('network.regenerate')}</button>
        </div>
      </section>

      <section className="network-status-strip">
        <div><BellRing size={18}/><span><small>{t('network.notifications')}</small><strong>{networkState.pushPermission === 'granted' ? t('network.active') : t('network.toEnable')}</strong></span></div>
        <div><UserCheck size={18}/><span><small>{t('network.protectMe')}</small><strong>{guardians.length}</strong></span></div>
        <div><Users size={18}/><span><small>{t('network.iProtect')}</small><strong>{following.length}</strong></span></div>
      </section>

      {!ready && <section className="network-offline-card v401-offline-card">
        <div className="network-offline-icon"><Link2 size={22}/></div>
        <div><strong>{t('v401.network.backendRequired')}</strong><p>{networkState.error || t('network.backendFallback')}</p></div>
        <button type="button" onClick={onRefresh}><RefreshCw size={17}/><span>{t('v401.network.retry')}</span></button>
      </section>}

      <NetworkList title={t('network.guardiansTitle')} subtitle={t('network.guardiansSubtitle')} rows={guardians} empty={t('network.guardiansEmpty')} onRemove={onRemoveLink} accent="green" t={t}/>
      <NetworkList title={t('network.followingTitle')} subtitle={t('network.followingSubtitle')} rows={following} empty={t('network.followingEmpty')} onRemove={onRemoveLink} accent="blue" t={t}/>

      <section className="network-how-card">
        <span className="network-how-number">01</span><div><strong>{t('network.scan')}</strong><p>{t('network.scanDesc')}</p></div>
        <span className="network-how-number">02</span><div><strong>{t('network.connect')}</strong><p>{t('network.connectDesc')}</p></div>
        <span className="network-how-number">03</span><div><strong>{t('network.receiveSos')}</strong><p>{t('network.receiveSosDesc')}</p></div>
      </section>
    </div>
  );
}

function NetworkList({ title, subtitle, rows, empty, onRemove, accent, t }) {
  return (
    <section className="network-list-card">
      <div className="network-list-heading"><div><h2>{title}</h2><p>{subtitle}</p></div><span>{rows.length}</span></div>
      <div className="network-list-body">
        {rows.map((row,index)=><div className="network-person-row" key={row.linkId} style={{'--delay':`${index*60}ms`}}><span className={`network-avatar ${accent}`}>{initials(row.displayName)}</span><div><strong>{row.displayName}</strong><small>{accent==='green'?t('network.receivesYourAlerts'):t('network.youReceiveTheirAlerts')}</small></div><button onClick={()=>onRemove(row.linkId)} aria-label={t('network.remove')}><Trash2 size={17}/></button></div>)}
        {!rows.length && <div className="network-empty"><QrCode size={25}/><span>{empty}</span></div>}
      </div>
    </section>
  );
}

function initials(value='') { return value.trim().split(/\s+/).slice(0,2).map((x)=>x[0]?.toUpperCase()).join('') || 'W'; }
