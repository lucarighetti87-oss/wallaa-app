import { useEffect } from 'react';
import { Activity, BellRing, CircleUserRound, Home, Link2, MapPin, Settings, Shield, UsersRound, X } from 'lucide-react';
import WallaaButton3D from './WallaaButton3D';

const items = [
  ['home', 'nav.home', Home],
  ['active-alert', 'v4.menu.activeAlert', BellRing],
  ['device', 'v4.menu.myButton', Link2],
  ['network', 'v4.menu.safetyNetwork', Shield],
  ['contacts', 'v4.menu.emergencyContacts', UsersRound],
  ['map', 'v4.menu.location', MapPin],
  ['activity', 'nav.activity', Activity],
  ['settings', 'nav.settings', Settings]
];

export default function SideMenu({ open, onClose, onNavigate, active, profile, device, telemetry, connectionStatus, t }) {
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || profile?.name || t('v4.menu.userFallback');
  const connectionLabel = connectionStatus === 'connected' ? t('v409.home.signalVerified') : connectionStatus === 'standby' ? t('v409.device.standby') : connectionStatus === 'weak' ? t('v4.menu.weak') : t('v4.menu.disconnected');
  const visualStatus = ['connected','standby'].includes(connectionStatus) ? 'connected' : connectionStatus === 'weak' ? 'weak' : 'disconnected';

  const navigate = (id) => {
    onNavigate?.(id);
    onClose?.();
  };

  return (
    <div className="side-menu-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
      <aside className="side-menu" role="dialog" aria-modal="true" aria-label="Menu Wallaa" onPointerDown={(event) => event.stopPropagation()}>
        <div className="side-menu-head">
          <strong>WALLAA</strong>
          <button type="button" onClick={onClose} aria-label={t('common.close')}><X size={21}/></button>
        </div>
        <div className="side-user-card"><CircleUserRound size={38}/><div><strong>{name}</strong><span>{profile?.email || t('v4.menu.ecosystem')}</span></div></div>
        <nav className="side-nav" aria-label="Menu Wallaa">
          {/* WALLAA_V4_0_66_SENTINEL_ACCESS_FIX: Sentinel role/network entry is visible to every authenticated plan. SOS dispatch remains a backend Pro entitlement. */}
          <button type="button" className={`${active === 'sentinel' ? 'active' : ''} side-sentinel-item`.trim()} onClick={() => navigate('sentinel')}><img src="/sentinel-shield.png" alt="" className="side-sentinel-icon"/><span>Sentinel</span>{profile?.plan === 'pro' ? <em>PRO</em> : null}</button>
          {items.map(([id,key,Icon]) => (
            <button type="button" key={id} className={active===id?'active':''} onClick={() => navigate(id)}>
              <Icon size={19}/><span>{t(key)}</span>
            </button>
          ))}
        </nav>
        <div className="side-device-footer">
          <div><strong>{connectionLabel} <i className={`status-dot ${connectionStatus}`}/></strong><span>Wallaa Button</span><span>{t('v4.menu.battery')} {telemetry?.battery != null ? `${telemetry.battery}%` : '—'}</span></div>
          <WallaaButton3D status={visualStatus} size="xs" compact />
        </div>
      </aside>
    </div>
  );
}
