import { Activity, Home, Link2, QrCode, Users } from 'lucide-react';

const items = [
  ['home', 'nav.home', Home], ['contacts', 'nav.contacts', Users], ['network', 'nav.network', QrCode], ['device', 'nav.device', Link2], ['activity', 'nav.activity', Activity]
];

export default function BottomNav({ active, onChange, t }) {
  return (
    <nav className="bottom-nav bottom-nav-five" aria-label="Wallaa Safe Button">
      {items.map(([id, key, Icon]) => (
        <button key={id} className={active === id ? 'active' : ''} onClick={() => onChange(id)}>
          <span className="nav-icon-shell"><Icon size={19} strokeWidth={active === id ? 2.65 : 2} /></span>
          <span className="nav-label">{t(key)}</span>{active === id && <i className="nav-active-dot" />}
        </button>
      ))}
    </nav>
  );
}
