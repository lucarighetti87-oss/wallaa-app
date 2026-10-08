import {uiText,uiLocale} from '../uiText.js';
import { Bell, Menu } from 'lucide-react';

import WallaaBrandShield from './WallaaBrandShield';
export default function V4TopBar({ onMenu, onNotifications, onHome }) {
  return (
    <header className="aa-topbar aa-topbar-v32 aa-topbar-v35 aa-topbar-v36 aa-topbar-v39">
      <button type="button" className="aa-topbar-btn aa-menu-trigger" onClick={onMenu} aria-label="Menu"><Menu size={25}/></button>
      <button type="button" className="aa-wordmark aa-wordmark-v32 aa-wordmark-v39 aa-wordmark-home" aria-label={uiText("Torna alla Home")} onClick={onHome}>
        <WallaaBrandShield className="aa-official-logo" alt="Wallaa" />
        <span className="aa-brand-copy"><strong>Wallaa</strong><small>SAFETY</small></span>
      </button>
      <button type="button" className="aa-topbar-btn aa-bell" onClick={onNotifications} aria-label={uiText("Notifiche")}><Bell size={23}/><i/></button>
    </header>
  );
}
