import { Bell, Menu, Settings } from 'lucide-react';
import Logo from './Logo';

export default function TopBar({ active, onSettings, onActivity, t }) {
  const home = active === 'home';
  return (
    <header className={`topbar ${home ? 'topbar-home' : 'topbar-light'}`}>
      {home ? (
        <>
          <button className="icon-button menu-button" aria-label="Menu"><Menu size={21} /></button><Logo />
          <div className="topbar-actions">
            <button className="icon-button" aria-label={t('common.notifications')} onClick={onActivity}><Bell size={20} /><span className="notification-dot" /></button>
            <button className="icon-button settings-ghost" aria-label={t('common.settings')} onClick={onSettings}><Settings size={18} /></button>
          </div>
        </>
      ) : (
        <><Logo compact /><div className="topbar-context">Wallaa Safe Button</div><div className="topbar-actions"><button className="icon-button" aria-label={t('common.settings')} onClick={onSettings}><Settings size={19} /></button></div></>
      )}
    </header>
  );
}
